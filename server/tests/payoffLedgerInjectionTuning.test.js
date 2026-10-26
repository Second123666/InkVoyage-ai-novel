const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  countForeshadowTerminalStates,
  buildSyntheticPayoffIssues,
  sortPayoffItemsByWindow,
} = require("../dist/services/payoff/payoffLedgerShared.js");
const {
  buildRuntimeLedgerFromCanonical,
} = require("../dist/services/novel/state/CanonicalStateService.js");
const {
  buildChapterPayoffDirectives,
} = require("../dist/services/novel/production/ContextAssemblyService.js");
const {
  CHAPTER_CONTEXT_PROVIDER_CONTRACTS,
  evaluateChapterContextProviderContracts,
} = require("../dist/services/novel/runtime/context/chapterContextProviderContracts.js");
const {
  PAYOFF_LEDGER_INJECTION_LIMITS,
  buildPayoffLedgerInjectionSections,
} = require("../dist/prompting/prompts/novel/chapterLayeredContextShared.js");

// INN-A1b 守卫:注入保底/排序/上限、风险信号透传、逾期语义升级、planner 回退计数。

function ledgerItem(id, overrides = {}) {
  return {
    id,
    ledgerKey: id,
    title: `伏笔 ${id}`,
    summary: "",
    scopeType: "book",
    currentStatus: "pending_payoff",
    targetStartChapterOrder: null,
    targetEndChapterOrder: null,
    firstSeenChapterOrder: 1,
    lastTouchedChapterOrder: 1,
    lastTouchedChapterId: null,
    setupChapterId: null,
    payoffChapterId: null,
    statusReason: null,
    confidence: null,
    sourceRefs: [],
    evidence: [],
    riskSignals: [],
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    ...overrides,
  };
}

function canonicalSnapshot(pendingPayoffs, overduePayoffs = []) {
  return {
    novelId: "novel-1",
    sourceSnapshotId: "snapshot-1",
    scopeLabel: "test",
    bookContract: {},
    worldState: null,
    characters: [],
    narrative: {
      pendingPayoffs,
      urgentPayoffs: [],
      overduePayoffs,
      payoffCounts: { paidOffCount: 2, failedCount: 1 },
      publicKnowledge: [],
      hiddenKnowledge: [],
      suspenseThreads: [],
    },
    timeline: [],
    createdAt: "2026-10-26T00:00:00.000Z",
  };
}

test("A1-G6:pending 按目标窗口排序，无窗口条目排最后", () => {
  const sorted = sortPayoffItemsByWindow([
    ledgerItem("no-window"),
    ledgerItem("late", { targetStartChapterOrder: 8, targetEndChapterOrder: 12 }),
    ledgerItem("early", { targetStartChapterOrder: 2, targetEndChapterOrder: 5 }),
    ledgerItem("tie-b", { targetStartChapterOrder: 3, targetEndChapterOrder: 5 }),
    ledgerItem("tie-a", { targetStartChapterOrder: 3, targetEndChapterOrder: 5 }),
  ]);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ["early", "tie-a", "tie-b", "late", "no-window"],
  );
});

test("A1-G3/G6:运行时账本透传风险信号与置信度，并对 pending 排序", () => {
  const runtime = buildRuntimeLedgerFromCanonical(canonicalSnapshot([
    ledgerItem("late", { targetEndChapterOrder: 12 }),
    ledgerItem("early", {
      targetEndChapterOrder: 5,
      confidence: 0.42,
      riskSignals: [{ code: "sync_stale", severity: "medium", summary: "同步过期", stale: true }],
    }),
  ]));
  assert.deepEqual(runtime.ledgerPendingItems.map((item) => item.id), ["early", "late"]);
  assert.equal(runtime.ledgerPendingItems[0].confidence, 0.42);
  assert.deepEqual(runtime.ledgerPendingItems[0].riskSignals, [
    { code: "sync_stale", severity: "medium", summary: "同步过期", stale: true },
  ]);
  assert.equal(runtime.ledgerSummary.paidOffCount, 2);
  assert.equal(runtime.ledgerSummary.failedCount, 1);
  assert.equal(runtime.ledgerSummary.totalCount, 5);
});

test("A1-G5:逾期条目在注入指令中升级为 payoff，而非 pressure", () => {
  const snapshot = canonicalSnapshot(
    [ledgerItem("pending", { currentStatus: "pending_payoff" })],
    [ledgerItem("overdue", { currentStatus: "overdue", targetEndChapterOrder: 4 })],
  );
  snapshot.narrative.currentChapterOrder = 10;
  const directives = buildChapterPayoffDirectives(snapshot, []);
  const overdue = directives.find((item) => item.ledgerKey === "overdue");
  const pending = directives.find((item) => item.ledgerKey === "pending");
  assert.equal(overdue.operation, "payoff");
  assert.match(overdue.reason, /目标窗口/);
  assert.equal(pending.operation, "pressure");
});

test("A1-G7:注入条数按紧急/逾期/待推进上限截断并汇总溢出", () => {
  const sections = buildPayoffLedgerInjectionSections({
    ledgerUrgentItems: Array.from({ length: 6 }, (_, index) => ledgerItem(`u${index}`)),
    ledgerOverdueItems: Array.from({ length: 5 }, (_, index) => ledgerItem(`o${index}`)),
    ledgerPendingItems: Array.from({ length: 4 }, (_, index) => ledgerItem(`p${index}`)),
  });
  assert.equal(sections.urgentLines.length, PAYOFF_LEDGER_INJECTION_LIMITS.urgent);
  assert.equal(sections.overdueLines.length, PAYOFF_LEDGER_INJECTION_LIMITS.overdue);
  assert.equal(sections.pendingLines.length, PAYOFF_LEDGER_INJECTION_LIMITS.pending);
  assert.equal(sections.overflowCount, 2 + 1 + 1);
});

test("A1-G8:provider contract 记录伏笔账本注入遥测", () => {
  assert.ok(CHAPTER_CONTEXT_PROVIDER_CONTRACTS.some((item) => item.id === "payoff_ledger"));
  const base = {
    stage: "write",
    chapterOrder: 5,
    contextPackage: {
      characterRoster: [],
      characterHardFacts: [],
      plan: null,
      chapterMission: null,
      previousChapterTail: null,
      previousChaptersSummary: [],
      storyWorldSlice: null,
      ragContext: "",
      bookStateSnapshot: [],
      volumeRecap: [],
      characterArcEvents: {},
      ledgerPendingItems: [],
      ledgerUrgentItems: [],
      ledgerOverdueItems: [],
      ledgerSummary: null,
    },
  };
  const withoutLedger = evaluateChapterContextProviderContracts(base)
    .find((item) => item.blockId === "payoff_ledger");
  assert.equal(withoutLedger, undefined, "没有账本时不产生噪音决策");

  const withLedger = evaluateChapterContextProviderContracts({
    ...base,
    contextPackage: {
      ...base.contextPackage,
      ledgerPendingItems: [ledgerItem("p1")],
      ledgerSummary: { totalCount: 1, pendingCount: 1, urgentCount: 0, overdueCount: 0, paidOffCount: 0, failedCount: 0, updatedAt: null },
    },
  }).find((item) => item.blockId === "payoff_ledger");
  assert.equal(withLedger.included, true);
  assert.equal(withLedger.tier, "situational");
});

test("A1-G23:sync_stale 风险进入合成问题", () => {
  const issues = buildSyntheticPayoffIssues([
    ledgerItem("stale", {
      riskSignals: [{ code: "sync_stale", severity: "medium", summary: "对账数据已过期" }],
    }),
  ], 10);
  const stale = issues.find((issue) => issue.code === "sync_stale");
  assert.ok(stale);
  assert.match(stale.fixSuggestion, /重新同步/);
});

test("planner 空账本回退：从状态快照补齐 paidOff/failed 计数", () => {
  assert.deepEqual(
    countForeshadowTerminalStates([
      { status: "paid_off" },
      { status: "paid_off" },
      { status: "failed" },
      { status: "pending_payoff" },
    ]),
    { paidOffCount: 2, failedCount: 1 },
  );
});

test("A1-G18:提供显式伏笔账本重新同步入口", () => {
  const routeSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "modules", "novel", "planning", "http", "novelPlanningRoutes.ts"),
    "utf8",
  );
  assert.match(routeSource, /router\.post\(\s*"\/:id\/payoff-ledger\/sync"/);
  assert.match(routeSource, /novelService\.syncPayoffLedger\(id\)/);

  const contracts = fs.readFileSync(
    path.join(__dirname, "..", "src", "services", "novel", "application", "NovelApplicationContracts.ts"),
    "utf8",
  );
  assert.match(contracts, /"syncPayoffLedger"/, "应用服务契约必须暴露同步方法");
});

test("A1-G19:验收 requiresFullPayoffReconcile 只在落库结果上触发全量对账", () => {
  const {
    shouldRequestFullPayoffReconcile,
  } = require("../dist/services/novel/runtime/ChapterAcceptanceAssessmentService.js");
  const flagged = { assetSyncRecommendation: { requiresFullPayoffReconcile: true } };
  const unflagged = { assetSyncRecommendation: { requiresFullPayoffReconcile: false } };
  assert.equal(shouldRequestFullPayoffReconcile(undefined, flagged), true);
  assert.equal(shouldRequestFullPayoffReconcile(true, flagged), true);
  assert.equal(shouldRequestFullPayoffReconcile(false, flagged), false, "候选评估不得触发");
  assert.equal(shouldRequestFullPayoffReconcile(undefined, unflagged), false);

  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "services", "novel", "runtime", "ChapterAcceptanceAssessmentService.ts"),
    "utf8",
  );
  assert.match(source, /shouldRequestFullPayoffReconcile\(input\.persist, normalized\)/);
  assert.match(source, /payoffLedgerSyncService\.syncLedger/);
});

test("A1-G25:Markdown 导出包含可读的伏笔清单", () => {
  const { buildMarkdownExportContent } = require("../dist/modules/export/novelExport.formatting.js");
  const payoffItems = [
    {
      id: "p1",
      novelId: "n1",
      ledgerKey: "k1",
      title: "铜钥匙",
      summary: "",
      scopeType: "book",
      currentStatus: "overdue",
      targetStartChapterOrder: 2,
      targetEndChapterOrder: 4,
      sourceRefs: [],
      evidence: [],
      riskSignals: [],
      statusReason: "超过目标窗口",
      createdAt: "2026-10-26T00:00:00.000Z",
      updatedAt: "2026-10-26T00:00:00.000Z",
    },
    {
      id: "p2",
      novelId: "n1",
      ledgerKey: "k2",
      title: "旧照片",
      summary: "",
      scopeType: "book",
      currentStatus: "paid_off",
      sourceRefs: [],
      evidence: [],
      riskSignals: [],
      createdAt: "2026-10-26T00:00:00.000Z",
      updatedAt: "2026-10-26T00:00:00.000Z",
    },
  ];
  const bundle = {
    metadata: { exportedAt: "2026-10-26T00:00:00.000Z", novelId: "n1", novelTitle: "测试书" },
    sections: {
      pipeline: {
        latestPipelineJob: null,
        qualityReport: { summary: { overall: 88 }, totalReports: 1, chapterReports: [] },
        bible: null,
        plotBeats: [],
        payoffLedger: {
          summary: {
            totalCount: 2,
            pendingCount: 0,
            urgentCount: 0,
            overdueCount: 1,
            paidOffCount: 1,
            failedCount: 0,
            updatedAt: null,
          },
          items: payoffItems,
          updatedAt: null,
        },
        latestStateSnapshot: null,
        chapterAuditReports: [],
      },
    },
  };
  const markdown = buildMarkdownExportContent(bundle, "pipeline");
  assert.match(markdown, /伏笔清单/);
  assert.match(markdown, /\[已逾期\] 铜钥匙（第 2-4 章）\s*— 超过目标窗口/);
  assert.match(markdown, /\[已回收\] 旧照片/);
  assert.match(markdown, /已回收 \/ 已失效/);
});

test("导演执行模块固定使用最新伏笔对账资产版本", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "services", "novel", "director", "workflowStepRuntime", "directorExecutionStepModules.ts"),
    "utf8",
  );
  assert.match(source, /id: "novel\.payoff_ledger\.sync", version: "v6"/);
});
