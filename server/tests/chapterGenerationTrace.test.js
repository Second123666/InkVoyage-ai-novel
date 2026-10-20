const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-B1 全链路 Trace 守卫(LOOP-10 · docs/plans/chapter-generation-trace.md)
require("../dist/app.js");
const { prisma } = require("../dist/db/prisma.js");
const {
  buildChapterGenerationTraceSections,
  chapterGenerationTraceService,
} = require("../dist/services/novel/runtime/chapterGenerationTraceService.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

const CONTEXT_PACKAGE = {
  chapter: { order: 12, title: "第12章" },
  contextGatingDecisions: [
    { blockId: "book_state_snapshot", tier: "situational", included: true, reason: "全书状态快照已提供" },
    { blockId: "volume_recap", tier: "situational", included: false, reason: "后段章节缺少卷内回顾，按降级语义继续" },
  ],
  contextCompressionLog: { dropped: ["rag_context"], summarized: [], usedTokens: 2380, budgetTokens: 2600 },
};

const RUNTIME_PACKAGE = {
  meta: { provider: "deepseek", model: "deepseek-chat", temperature: 0.7, runId: "run-1", acceptanceStatus: "passed" },
  audit: {
    score: { overall: 82 },
    reports: [{
      id: "report-1",
      auditType: "continuity",
      overallScore: 70,
      summary: "存在一致性冲突。",
      issues: [{ id: "i1", code: "continuity_world_rule_conflict" }, { id: "i2", code: "prose_rhythm" }],
    }],
    openIssues: [{ id: "i1", code: "continuity_world_rule_conflict" }],
    hasBlockingIssues: false,
  },
  failureClassification: { code: "none", summary: "无失败" },
  replanRecommendation: { recommended: false, action: "continue_with_warning", reason: "仅质量债" },
};

const ACCEPTANCE = { status: "passed", repairability: "none", decisionReason: "可继续推进" };

test("四段轨迹组装:上下文装配/模型参数/审核码/验收与重规划决策", () => {
  const sections = buildChapterGenerationTraceSections({
    contextPackage: CONTEXT_PACKAGE,
    runtimePackage: RUNTIME_PACKAGE,
    acceptance: ACCEPTANCE,
  });
  assert.equal(sections.context.gatingDecisions.length, 2, "gating 决策必须进轨迹");
  assert.deepEqual(sections.context.compression.dropped, ["rag_context"], "压缩日志必须进轨迹");
  assert.equal(sections.generation.provider, "deepseek");
  assert.equal(sections.generation.model, "deepseek-chat");
  assert.equal(sections.generation.runId, "run-1");
  assert.deepEqual(sections.audit.reports[0].issueCodes, ["continuity_world_rule_conflict", "prose_rhythm"]);
  assert.deepEqual(sections.audit.openIssueCodes, ["continuity_world_rule_conflict"]);
  assert.equal(sections.audit.overallScore, 82);
  assert.equal(sections.decision.acceptanceStatus, "passed");
  assert.equal(sections.decision.replanAction, "continue_with_warning");
  assert.equal(sections.decision.failureCode, "none");
});

test("record 落库与 list 解析往返(prisma stub)", async () => {
  const restores = [];
  const stub = (model, method, impl) => {
    const original = prisma[model][method];
    prisma[model][method] = impl;
    restores.push(() => {
      prisma[model][method] = original;
    });
  };
  try {
    let created = null;
    stub("chapterGenerationTrace", "create", async ({ data }) => {
      created = data;
      return { id: "trace-1", createdAt: new Date("2026-10-20T12:00:00.000Z"), ...data };
    });
    await chapterGenerationTraceService.record({
      novelId: "novel-1",
      chapterId: "chapter-1",
      chapterOrder: 12,
      runId: "run-1",
      contextPackage: CONTEXT_PACKAGE,
      runtimePackage: RUNTIME_PACKAGE,
      acceptance: ACCEPTANCE,
    });
    assert.equal(created.novelId, "novel-1");
    assert.equal(created.chapterOrder, 12);
    const contextJson = JSON.parse(created.contextJson);
    assert.equal(contextJson.compression.budgetTokens, 2600);
    const decisionJson = JSON.parse(created.decisionJson);
    assert.equal(decisionJson.acceptanceStatus, "passed");

    stub("chapterGenerationTrace", "findMany", async () => [{
      id: "trace-1",
      novelId: "novel-1",
      chapterId: "chapter-1",
      chapterOrder: 12,
      runId: "run-1",
      contextJson: created.contextJson,
      generationJson: created.generationJson,
      auditJson: created.auditJson,
      decisionJson: created.decisionJson,
      createdAt: new Date("2026-10-20T12:00:00.000Z"),
    }]);
    const list = await chapterGenerationTraceService.list("novel-1", "chapter-1");
    assert.equal(list.length, 1);
    assert.equal(list[0].generation.model, "deepseek-chat");
    assert.equal(list[0].decision.replanRecommended, false);
    assert.equal(list[0].createdAt, "2026-10-20T12:00:00.000Z");
  } finally {
    for (const restore of restores) {
      restore();
    }
  }
});

test("定稿钩子与只读路由静态契约", () => {
  const finalization = readSource("services", "novel", "runtime", "ChapterContentFinalizationService.ts");
  assert.match(finalization, /chapterGenerationTraceService\.record\(/, "定稿必须记录生成轨迹");
  assert.match(finalization, /\.record\(\{[\s\S]*?\}\)\.catch\(\(\) => null\)/, "轨迹写入失败不得影响主链");
  assert.match(finalization, /runtimePackage,[\s\S]*?acceptance: acceptance\.assessment/, "轨迹必须携带运行时包与验收结论");

  const route = readSource("routes", "chapterTrace.ts");
  assert.match(route, /chapterTraceRouter\.get\("/, "轨迹查询必须是只读 GET");
  assert.doesNotMatch(route, /\.(post|patch|put|delete)\(/, "轨迹路由不得提供写操作");

  const app = readSource("app.ts");
  assert.match(app, /app\.use\("\/api\/chapter-traces", chapterTraceRouter\)/, "轨迹路由必须挂载");
});

test("上下文压缩日志进入 package 并随轨迹持久化", () => {
  const assembler = readSource("services", "novel", "runtime", "GenerationContextAssembler.ts");
  assert.match(assembler, /contextPackage\.contextCompressionLog = compressionLog/, "装配器必须把压缩日志写入 package");
  const shared = fs.readFileSync(path.resolve(repoRoot, "..", "shared", "types", "chapterRuntime.ts"), "utf8");
  assert.match(shared, /contextCompressionLog: z/, "package schema 必须声明压缩日志字段");
});
