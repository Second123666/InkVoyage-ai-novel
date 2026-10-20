const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-B3 成本感知模型路由守卫(LOOP-11 · docs/plans/cost-aware-model-routing.md)
require("../dist/app.js");
const { prisma } = require("../dist/db/prisma.js");
const {
  ModelPricingSettingsService,
  parseModelPrices,
  resolveModelPriceKey,
} = require("../dist/services/settings/ModelPricingSettingsService.js");
const {
  buildCostReport,
  estimateCost,
  modelCostReportService,
} = require("../dist/services/llm/ModelCostReportService.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("价格解析与键规范化:合法/损坏/负数/大小写", () => {
  assert.equal(resolveModelPriceKey("DeepSeek", "deepseek-chat"), "deepseek::deepseek-chat");
  assert.equal(resolveModelPriceKey(null, "m"), null);
  assert.equal(resolveModelPriceKey("p", " "), null);

  const parsed = parseModelPrices(JSON.stringify({
    prices: {
      "deepseek::deepseek-chat": { inputPer1M: 2, outputPer1M: 4 },
      "bad::negative": { inputPer1M: -1, outputPer1M: 1 },
      "bad::missing": { inputPer1M: 1 },
    },
  }));
  assert.deepEqual(Object.keys(parsed), ["deepseek::deepseek-chat"]);
  assert.equal(parsed["deepseek::deepseek-chat"].outputPer1M, 4);

  assert.deepEqual(parseModelPrices("not-json"), {});
  assert.deepEqual(parseModelPrices(null), {});
});

test("estimateCost:token×单价/1M,缺价格返回 null", () => {
  assert.equal(estimateCost({ promptTokens: 1_000_000, completionTokens: 500_000 }, { inputPer1M: 2, outputPer1M: 4 }), 4);
  assert.equal(estimateCost({ promptTokens: 1234, completionTokens: 567 }, null), null);
  assert.equal(estimateCost({ promptTokens: 100, completionTokens: 100 }, { inputPer1M: 0.333333, outputPer1M: 0 }), 0.000033);
});

test("成本报告:当前路由 vs 经济/强模型路由对比与节省额", () => {
  const events = [
    { taskType: "chapter_writer", provider: "deepseek", model: "deepseek-chat", promptTokens: 1_000_000, completionTokens: 500_000 },
    { taskType: "chapter_review", provider: "deepseek", model: "deepseek-chat", promptTokens: 200_000, completionTokens: 100_000 },
    { taskType: "outline_plan", provider: "unknown", model: "mystery-model", promptTokens: 50_000, completionTokens: 10_000 },
  ];
  const prices = {
    "deepseek::deepseek-chat": { inputPer1M: 2, outputPer1M: 4 },
    "cheap::cheap-model": { inputPer1M: 0.1, outputPer1M: 0.2 },
    "premium::premium-model": { inputPer1M: 10, outputPer1M: 20 },
  };
  const routes = [
    { taskType: "chapter_writer", provider: "deepseek", model: "deepseek-chat" },
    { taskType: "chapter_review", provider: "premium", model: "premium-model" },
  ];

  const report = buildCostReport({ events, routes, prices, periodDays: 30 });
  assert.equal(report.periodDays, 30);
  const writer = report.rows.find((row) => row.taskType === "chapter_writer");
  assert.equal(writer.currentRouteModel, "deepseek::deepseek-chat");
  assert.equal(writer.currentRouteCost, 4, "当前路由成本 = 1M×2 + 0.5M×4");
  assert.equal(writer.cheapestModel, "cheap::cheap-model");
  assert.equal(writer.cheapestCost, 0.2, "经济路由成本");
  assert.equal(writer.premiumCost, 20, "强模型路由成本");
  assert.equal(writer.savingsVsCheapest, 3.8, "节省额 = 当前 - 经济");

  const review = report.rows.find((row) => row.taskType === "chapter_review");
  assert.equal(review.currentRouteCost, 4, "审核按配置的强模型路由计价(0.2M×10 + 0.1M×20)");

  assert.deepEqual(report.unpricedModels, ["unknown::mystery-model"], "未定价模型列入清单");
  const plan = report.rows.find((row) => row.taskType === "outline_plan");
  assert.equal(plan.actualCost, null, "存在未定价模型时实际成本不可用");

  assert.equal(report.totals.currentRouteCost, null, "审核/写作合计中 plan 行缺路由 → 汇总保守返回 null");
  assert.equal(report.totals.cheapestCost, 0.247, "经济路由总量 = 0.2 + 0.04 + 0.007(全部行都有 token 量)");
});

test("空窗口:无事件时返回空报告", () => {
  const report = buildCostReport({ events: [], routes: [], prices: { "a::b": { inputPer1M: 1, outputPer1M: 1 } }, periodDays: 7 });
  assert.equal(report.rows.length, 0);
  assert.equal(report.totals.actualCost, null);
  assert.deepEqual(report.pricedModels, ["a::b"]);
});

test("服务取数:窗口过滤 + 路由 + 价格读取(prisma stub)", async () => {
  const restores = [];
  const stub = (model, method, impl) => {
    const original = prisma[model][method];
    prisma[model][method] = impl;
    restores.push(() => {
      prisma[model][method] = original;
    });
  };
  try {
    let capturedWhere = null;
    stub("llmUsageEvent", "findMany", async (args) => {
      capturedWhere = args.where;
      return [{ taskType: "chapter_writer", provider: "deepseek", model: "deepseek-chat", promptTokens: 1000, completionTokens: 500 }];
    });
    stub("modelRouteConfig", "findMany", async () => ([
      { taskType: "chapter_writer", provider: "deepseek", model: "deepseek-chat" },
    ]));
    stub("appSetting", "findUnique", async () => ({
      key: "llm.model_prices",
      value: JSON.stringify({ prices: { "deepseek::deepseek-chat": { inputPer1M: 2, outputPer1M: 4 } } }),
    }));

    const report = await modelCostReportService.buildReport("novel-1", 30);
    assert.equal(capturedWhere.novelId, "novel-1");
    assert.ok(capturedWhere.createdAt.gte instanceof Date, "必须按时间窗口过滤");
    assert.equal(report.rows.length, 1);
    assert.equal(report.rows[0].currentRouteCost, 0.004, "(1000×2 + 500×4)/1M");
  } finally {
    for (const restore of restores) {
      restore();
    }
  }
});

test("价格服务保存:校验与 upsert(store 注入)", async () => {
  let upserted = null;
  const service = new ModelPricingSettingsService({
    appSettingStore: {
      findUnique: async () => null,
      upsert: async (args) => {
        upserted = args;
        return null;
      },
    },
  });
  const saved = await service.savePrices({
    prices: [
      { provider: "DeepSeek", model: "deepseek-chat", inputPer1M: 2, outputPer1M: 4 },
      { provider: "", model: "m", inputPer1M: 1, outputPer1M: 1 },
      { provider: "p", model: "neg", inputPer1M: -1, outputPer1M: 1 },
    ],
  });
  assert.deepEqual(Object.keys(saved), ["deepseek::deepseek-chat"]);
  assert.equal(upserted.where.key, "llm.model_prices");
  assert.match(upserted.create.value, /deepseek::deepseek-chat/);
});

test("静态契约:计量钩子/设置端点/成本路由", () => {
  const usage = readSource("llm", "usageTracking.ts");
  assert.match(usage, /prisma\.llmUsageEvent\.create\(/, "每次调用必须写入按书计量流水");
  assert.match(usage, /const novelId = context\?\.novelId \?\? record\?\.meta\?\.promptMeta\?\.novelId/, "无书上下文不得写入");

  const settings = readSource("routes", "settings.ts");
  assert.match(settings, /router\.get\("\/model-prices"/, "价格读取端点必须存在");
  assert.match(settings, /router\.put\(\s*"\/model-prices"/, "价格保存端点必须存在");

  const route = readSource("routes", "costReport.ts");
  assert.match(route, /costReportRouter\.get\(\s*"\/:novelId"/, "成本报告必须是只读 GET");
  assert.doesNotMatch(route, /\.(post|patch|put|delete)\(/, "成本报告路由不得提供写操作");

  const app = readSource("app.ts");
  assert.match(app, /app\.use\("\/api\/cost-report", costReportRouter\)/, "成本报告路由必须挂载");
});
