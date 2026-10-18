const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// 伏笔账本 MVP 守卫(LOOP-5 / INN-A1 · docs/plans/payoff-ledger-mvp.md §3)
require("../dist/app.js");
const { prisma } = require("../dist/db/prisma.js");
const {
  PAYOFF_STALE_AFTER_CHAPTERS,
  buildSyntheticPayoffIssues,
  classifyPayoffLedgerItems,
  isPayoffOverdueAtChapter,
} = require("../dist/services/payoff/payoffLedgerShared.js");
const {
  buildRuntimeLedgerFromCanonical,
} = require("../dist/services/novel/state/CanonicalStateService.js");
const {
  payoffLedgerSyncService,
} = require("../dist/services/payoff/PayoffLedgerSyncService.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

function buildLedgerItem(overrides = {}) {
  return {
    id: "item-1",
    novelId: "novel-1",
    ledgerKey: "ledger-1",
    title: "铜钥匙",
    summary: "库房后门的钥匙,等待回收。",
    scopeType: "book",
    currentStatus: "pending_payoff",
    targetStartChapterOrder: null,
    targetEndChapterOrder: null,
    firstSeenChapterOrder: null,
    lastTouchedChapterOrder: null,
    lastTouchedChapterId: null,
    setupChapterId: null,
    payoffChapterId: null,
    lastSnapshotId: null,
    sourceRefs: [],
    evidence: [],
    riskSignals: [],
    statusReason: null,
    confidence: null,
    manualLocked: false,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

test("A1-G4 读时升格:pending-like 且窗口已过视为逾期,窗口内不升格", () => {
  const pastWindow = { currentStatus: "pending_payoff", targetEndChapterOrder: 10 };
  assert.equal(isPayoffOverdueAtChapter(pastWindow, 12), true, "过窗待回收应升格为逾期");
  assert.equal(
    isPayoffOverdueAtChapter({ ...pastWindow, currentStatus: "hinted" }, 12),
    true,
    "hinted(同为 pending-like)过窗同样升格",
  );
  assert.equal(
    isPayoffOverdueAtChapter({ currentStatus: "pending_payoff", targetEndChapterOrder: null }, 12),
    false,
    "无窗口不升格",
  );
  assert.equal(
    isPayoffOverdueAtChapter({ currentStatus: "paid_off", targetEndChapterOrder: 10 }, 12),
    false,
    "已终结条目不升格",
  );
  assert.equal(isPayoffOverdueAtChapter({ currentStatus: "pending_payoff", targetEndChapterOrder: 12 }, 12), false, "窗口内不升格");
  // 存储态逾期:窗口内降级(保留原语义)
  assert.equal(isPayoffOverdueAtChapter({ currentStatus: "overdue", targetEndChapterOrder: 12 }, 12), false, "存储态逾期在窗口内降级");
  assert.equal(isPayoffOverdueAtChapter({ currentStatus: "overdue", targetEndChapterOrder: 10 }, 12), true, "存储态逾期过窗保持");
});

test("A1-G4 分类:升格项只进 overdue 桶,不重复计入 pending", () => {
  const items = [
    buildLedgerItem({ id: "a", ledgerKey: "a", currentStatus: "pending_payoff", targetEndChapterOrder: 5 }),
    buildLedgerItem({ id: "b", ledgerKey: "b", currentStatus: "pending_payoff", targetEndChapterOrder: 50 }),
  ];
  const classified = classifyPayoffLedgerItems(items, 10);
  assert.equal(classified.overdueItems.length, 1);
  assert.equal(classified.overdueItems[0].ledgerKey, "a");
  assert.deepEqual(
    classified.pendingItems.map((item) => item.ledgerKey),
    ["b"],
    "升格项不得再出现在 pending 桶",
  );
});

test("A1-G17 停滞扫描:长期未触碰的未终结伏笔产生推进提醒", () => {
  const staleItem = buildLedgerItem({
    currentStatus: "setup",
    firstSeenChapterOrder: 1,
    lastTouchedChapterOrder: 1,
  });
  const chapterOrder = 1 + PAYOFF_STALE_AFTER_CHAPTERS + 5;
  const staleIssues = buildSyntheticPayoffIssues([staleItem], chapterOrder);
  assert.ok(
    staleIssues.some((issue) => issue.code === "payoff_missing_progress" && issue.ledgerKey === "ledger-1"),
    "超过阈值未触碰应产生 payoff_missing_progress",
  );

  const freshIssues = buildSyntheticPayoffIssues([staleItem], 5);
  assert.equal(
    freshIssues.filter((issue) => issue.code === "payoff_missing_progress").length,
    0,
    "阈值内不产生停滞提醒",
  );

  const terminalIssues = buildSyntheticPayoffIssues(
    [buildLedgerItem({ currentStatus: "paid_off", firstSeenChapterOrder: 1 })],
    chapterOrder,
  );
  assert.equal(terminalIssues.length, 0, "已终结条目不参与停滞扫描(反证断言)");
});

test("A1-G21 运行时账本摘要携带真实回收/失败计数,旧快照按 0 解析", () => {
  const baseSnapshot = {
    novelId: "novel-1",
    sourceSnapshotId: "snap-1",
    scopeLabel: "第 1 章",
    createdAt: "2026-10-18T00:00:00.000Z",
    narrative: {
      currentPhase: "production",
      pendingPayoffs: [{
        id: "p1",
        ledgerKey: "p1",
        title: "待回收",
        summary: "s",
        currentStatus: "pending_payoff",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      }],
      urgentPayoffs: [],
      overduePayoffs: [{
        id: "o1",
        ledgerKey: "o1",
        title: "逾期",
        summary: "s",
        currentStatus: "overdue",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      }],
      payoffCounts: { paidOffCount: 7, failedCount: 2 },
    },
  };
  const ledger = buildRuntimeLedgerFromCanonical(baseSnapshot);
  assert.equal(ledger.ledgerSummary.paidOffCount, 7);
  assert.equal(ledger.ledgerSummary.failedCount, 2);
  assert.equal(ledger.ledgerSummary.totalCount, 1 + 1 + 7 + 2, "totalCount 应覆盖全部在册条目");

  const legacySnapshot = {
    ...baseSnapshot,
    narrative: { ...baseSnapshot.narrative, payoffCounts: undefined },
  };
  const legacyLedger = buildRuntimeLedgerFromCanonical(legacySnapshot);
  assert.equal(legacyLedger.ledgerSummary.paidOffCount, 0, "旧快照无计数字段时按 0 解析");
  assert.equal(legacyLedger.ledgerSummary.failedCount, 0);
});

test("A1-G20/G22 静态守卫:逾期不进 blocking、增量路径复用统一守卫", () => {
  const buildersSource = readSource("services", "novel", "runtime", "chapterRuntimePackageBuilders.ts");
  assert.match(buildersSource, /isSyntheticOverdueBlocker/, "blocking 剥离函数必须存在");
  assert.match(buildersSource, /issue\.code !== "payoff_overdue"/, "blockingLedgerKeys 需排除逾期合成问题");

  const deltaSource = readSource("services", "novel", "runtime", "ChapterArtifactDeltaService.ts");
  assert.match(deltaSource, /sanitizePayoffLedgerSyncItem/, "增量路径必须复用统一守卫");
  assert.match(deltaSource, /lockedByUser \? previous\.currentStatus/, "增量路径必须跳过锁定项状态覆盖");

  const syncSource = readSource("services", "payoff", "PayoffLedgerSyncService.ts");
  assert.match(syncSource, /lockedByUser \? previous\.currentStatus/, "对账路径必须跳过锁定项状态覆盖");
  assert.match(syncSource, /row\.manualLocked === true/, "系统标记循环必须跳过锁定项");

  const inventorySource = readSource("services", "novel", "director", "runtime", "DirectorWorkspaceQualityArtifactInventory.ts");
  assert.match(inventorySource, /"failed" \|\| item\.currentStatus === "overdue"/, "A1-G14:逾期映射进需复核口径");
});

test("A1-G1/G10 路由与手动服务:登记默认不锁,状态标记默认锁定", async () => {
  const routesSource = readSource("modules", "novel", "planning", "http", "novelPlanningRoutes.ts");
  assert.match(routesSource, /router\.post\(\s*"\/:id\/payoff-ledger"/, "POST 登记路由必须存在");
  assert.match(routesSource, /router\.patch\(\s*"\/:id\/payoff-ledger\/:itemId"/, "PATCH 更新路由必须存在");

  const restores = [];
  const stub = (model, method, impl) => {
    const original = prisma[model][method];
    prisma[model][method] = impl;
    restores.push(() => {
      prisma[model][method] = original;
    });
  };
  try {
    let createdPayload = null;
    stub("novel", "findUnique", async () => ({ id: "novel-1" }));
    stub("payoffLedgerItem", "create", async ({ data }) => {
      createdPayload = data;
      return { id: "manual-row", novelId: data.novelId, ledgerKey: data.ledgerKey, createdAt: new Date(), updatedAt: data.updatedAt, ...data };
    });
    const created = await payoffLedgerSyncService.createManualLedgerItem("novel-1", {
      title: "  铜钥匙  ",
      summary: "库房后门的钥匙。",
    });
    assert.ok(createdPayload.ledgerKey.startsWith("manual_"), "手动登记 ledgerKey 必须带 manual_ 前缀");
    assert.equal(createdPayload.currentStatus, "setup");
    assert.equal(createdPayload.manualLocked, false, "手动登记不加锁,允许 AI 继续推进");
    assert.match(createdPayload.sourceRefsJson, /"kind":"manual"/, "来源必须标记 manual");
    assert.equal(created.title, "铜钥匙", "标题应去除首尾空白");
    assert.equal(typeof created.manualLocked, "boolean");

    let updatedPayload = null;
    stub("payoffLedgerItem", "findFirst", async () => ({ id: "manual-row", novelId: "novel-1" }));
    stub("payoffLedgerItem", "update", async ({ data }) => {
      updatedPayload = data;
      return { id: "manual-row", novelId: "novel-1", ledgerKey: "manual_x", createdAt: new Date(), updatedAt: data.updatedAt, ...data };
    });
    await payoffLedgerSyncService.updateManualLedgerItem("novel-1", "manual-row", {
      currentStatus: "paid_off",
    });
    assert.equal(updatedPayload.currentStatus, "paid_off");
    assert.equal(updatedPayload.manualLocked, true, "任何状态标记默认锁定防 AI 覆盖");
    assert.match(updatedPayload.statusReason, /用户标记为已回收/);

    await payoffLedgerSyncService.updateManualLedgerItem("novel-1", "manual-row", {
      currentStatus: "pending_payoff",
      manualLocked: false,
    });
    assert.equal(updatedPayload.manualLocked, false, "重新打开必须显式解锁交还 AI");
    assert.match(updatedPayload.statusReason, /用户重新打开跟踪/);
  } finally {
    for (const restore of restores) {
      restore();
    }
  }
});

test("A1-G12/G13/G16/G26 客户端合同", () => {
  const clientRoot = path.resolve(repoRoot, "..", "client", "src");
  const cardSource = fs.readFileSync(path.join(clientRoot, "pages", "novels", "components", "BookPayoffLedgerCard.tsx"), "utf8");
  for (const label of ["新增伏笔", "标记已回收", "标记放弃", "重新打开", "手动"]) {
    assert.ok(cardSource.includes(label), `卡片必须包含「${label}」交互文案`);
  }
  assert.match(cardSource, /正在同步伏笔账本/, "空态需区分加载中");
  assert.match(cardSource, /伏笔账本读取失败/, "空态需区分读取失败");

  const editSource = fs.readFileSync(path.join(clientRoot, "pages", "novels", "NovelEdit.tsx"), "utf8");
  assert.match(editSource, /activeTab === "outline"/, "A1-G12:大纲页签必须加载账本");

  const outlineSource = fs.readFileSync(path.join(clientRoot, "pages", "novels", "components", "OutlineTab.tsx"), "utf8");
  assert.match(outlineSource, /逾期 \{payoffLedger\?\.summary\.overdueCount\}/, "A1-G16:资产约束子页需有逾期徽标");

  const volumeSource = fs.readFileSync(path.join(clientRoot, "pages", "novels", "components", "VolumePayoffOverviewCard.tsx"), "utf8");
  assert.doesNotMatch(volumeSource, /已经挪到/, "A1-G26:改口式文案必须清除");
});
