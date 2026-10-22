const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-D1 生产链 token 预算守卫(LOOP-17 · docs/plans/production-token-budget.md)
require("../dist/app.js");
const {
  ProductionTokenBudgetSettingsService,
  parseProductionTokenBudgetSettings,
  resolveProductionTokenBudget,
  PRODUCTION_TOKEN_BUDGET_SETTING_KEY,
} = require("../dist/services/settings/ProductionTokenBudgetSettingsService.js");
const {
  ProductionTokenBudgetService,
  evaluateProductionTokenBudget,
} = require("../dist/services/llm/ProductionTokenBudgetService.js");
const {
  recordTokenBudgetExceededSignal,
} = require("../dist/services/novel/director/runtime/DirectorCircuitBreakerService.js");
const {
  DIRECTOR_CIRCUIT_BREAKER_REASONS,
} = require("@ai-novel/shared/types/novelDirector");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

function createSettingStore(initialValue = null) {
  let value = initialValue;
  return {
    async findUnique() {
      return value === null ? null : { key: PRODUCTION_TOKEN_BUDGET_SETTING_KEY, value };
    },
    async upsert(args) {
      value = args.create.value;
      return {};
    },
    read() {
      return value;
    },
  };
}

test("预算设置解析:默认值、按书覆盖、非法条目与损坏 JSON", () => {
  const parsed = parseProductionTokenBudgetSettings(JSON.stringify({
    defaultTokens: 500000,
    novels: {
      n1: 120000,
      zero: 0,
      negative: -1,
      text: "abc",
    },
  }));
  assert.equal(parsed.defaultTokens, 500000);
  assert.deepEqual(parsed.novels, { n1: 120000 });

  const wrapped = parseProductionTokenBudgetSettings(JSON.stringify({
    budgets: { defaultTokens: 300, novels: { n2: 900 } },
  }));
  assert.equal(wrapped.defaultTokens, 300);
  assert.equal(wrapped.novels.n2, 900);

  assert.deepEqual(parseProductionTokenBudgetSettings(null), { defaultTokens: null, novels: {} });
  assert.deepEqual(parseProductionTokenBudgetSettings("{bad json"), { defaultTokens: null, novels: {} });
  assert.deepEqual(parseProductionTokenBudgetSettings(JSON.stringify({ defaultTokens: 0 })), {
    defaultTokens: null,
    novels: {},
  });
});

test("预算解析优先级:按书覆盖优先于全局默认", () => {
  const settings = { defaultTokens: 1000, novels: { n1: 2000 } };
  assert.equal(resolveProductionTokenBudget(settings, "n1"), 2000);
  assert.equal(resolveProductionTokenBudget(settings, "n2"), 1000);
  assert.equal(resolveProductionTokenBudget({ defaultTokens: null, novels: {} }, "n1"), null);
  assert.equal(resolveProductionTokenBudget({ defaultTokens: null, novels: {} }, ""), null);
});

test("预算判定:严格超过才算超限,非法值按未设置处理", () => {
  assert.deepEqual(evaluateProductionTokenBudget({ budgetTokens: 100, usedTokens: 100 }), {
    budgetTokens: 100,
    usedTokens: 100,
    exceeded: false,
  });
  assert.deepEqual(evaluateProductionTokenBudget({ budgetTokens: 100, usedTokens: 101 }), {
    budgetTokens: 100,
    usedTokens: 101,
    exceeded: true,
  });
  assert.equal(evaluateProductionTokenBudget({ budgetTokens: null, usedTokens: 999 }).exceeded, false);
  assert.equal(evaluateProductionTokenBudget({ budgetTokens: 0, usedTokens: 1 }).budgetTokens, null);
  assert.equal(evaluateProductionTokenBudget({ budgetTokens: 10, usedTokens: -5 }).usedTokens, 0);
});

test("按书预算保存:保留其他书的预算,支持覆盖与清除", async () => {
  const store = createSettingStore(JSON.stringify({
    defaultTokens: 1000,
    novels: { other: 5000, target: 800 },
  }));
  const service = new ProductionTokenBudgetSettingsService({ appSettingStore: store });

  await service.saveNovelBudget("target", 2500);
  let settings = await service.getSettings();
  assert.equal(settings.novels.target, 2500);
  assert.equal(settings.novels.other, 5000);
  assert.equal(settings.defaultTokens, 1000);

  await service.saveNovelBudget("target", null);
  settings = await service.getSettings();
  assert.equal(settings.novels.target, undefined);
  assert.equal(settings.novels.other, 5000);

  await assert.rejects(() => service.saveNovelBudget("target", 0), /大于 0/);
  assert.equal(JSON.parse(store.read()).novels.other, 5000);
});

test("预算状态:累计用量来自按书流水,超限时标记 exceeded", async () => {
  const settingsService = {
    async getBudgetForNovel() {
      return 1000;
    },
  };
  const usageStore = {
    async aggregate(input) {
      assert.deepEqual(input.where, { novelId: "n1" });
      return { _sum: { totalTokens: 1500 } };
    },
  };
  const service = new ProductionTokenBudgetService({ settingsService, usageStore });
  const status = await service.getStatus("n1");
  assert.deepEqual(status, {
    novelId: "n1",
    budgetTokens: 1000,
    usedTokens: 1500,
    exceeded: true,
  });

  const unreadable = new ProductionTokenBudgetService({
    settingsService: { async getBudgetForNovel() { throw new Error("db down"); } },
    usageStore: { async aggregate() { throw new Error("db down"); } },
  });
  assert.deepEqual(await unreadable.getStatus("n1"), {
    novelId: "n1",
    budgetTokens: null,
    usedTokens: 0,
    exceeded: false,
  });
});

test("熔断信号:预算超限生成可恢复的暂停状态", () => {
  const state = recordTokenBudgetExceededSignal({ usedTokens: 2100, budgetTokens: 2000 });
  assert.equal(state.status, "open");
  assert.equal(state.reason, "token_budget_exceeded");
  assert.equal(state.recoveryAction, "resume_after_review");
  assert.match(state.message, /2100 Tokens/);
  assert.match(state.message, /2000 Tokens/);
  assert.ok(DIRECTOR_CIRCUIT_BREAKER_REASONS.includes("token_budget_exceeded"));
});

test("接线契约:章节边界检查预算、问题码映射与预算端点齐全", () => {
  const runtime = readSource(
    "services",
    "novel",
    "director",
    "automation",
    "novelDirectorAutoExecutionCircuitBreakerRuntime.ts",
  );
  assert.match(runtime, /productionTokenBudgetService\.getStatus\(input\.novelId\)/);
  assert.match(runtime, /recordTokenBudgetExceededSignal/);
  assert.match(runtime, /case "token_budget_exceeded": return "runtime\.token_budget_exceeded"/);

  const route = readSource("routes", "productionBudget.ts");
  assert.match(route, /productionBudgetRouter\.get\(\s*"\/:novelId"/);
  assert.match(route, /productionBudgetRouter\.put\(\s*"\/:novelId"/);
  assert.match(route, /productionTokenBudgetSettingsService\.saveNovelBudget/);
  assert.match(readSource("app.ts"), /app\.use\("\/api\/production-budget", productionBudgetRouter\)/);
});
