const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-A3 分层递归记忆守卫(LOOP-8 · docs/plans/layered-memory.md)
require("../dist/app.js");
const {
  buildBookStateSnapshotLines,
  buildVolumeRecapLines,
  resolveCurrentVolumeChapterOrders,
} = require("../dist/services/novel/runtime/context/layeredMemoryContext.js");
const {
  CHAPTER_CONTEXT_PROVIDER_CONTRACTS,
  evaluateChapterContextProviderContracts,
} = require("../dist/services/novel/runtime/context/chapterContextProviderContracts.js");
const { findRegisteredPromptAssetById } = require("../dist/prompting/registry.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("全书状态快照:过滤未来事件、按章序取最近 8 条、摘要截断", () => {
  const timeline = Array.from({ length: 12 }, (_, index) => ({
    chapterOrder: index + 1,
    title: `事件${index + 1}`,
    summary: `摘要${index + 1}`,
  }));
  const lines = buildBookStateSnapshotLines(timeline, 10);
  assert.equal(lines.length, 8, "最多 8 条");
  assert.ok(!lines.some((line) => line.startsWith("第10章")), "当前章及之后的事件不得进入快照");
  assert.ok(lines[0].startsWith("第2章"), "按章序取最近 8 条(第 2-9 章)");
  assert.ok(lines[lines.length - 1].startsWith("第9章"));

  const long = buildBookStateSnapshotLines(
    [{ chapterOrder: 1, title: "大事件", summary: "长".repeat(300) }],
    5,
  );
  assert.ok(long[0].includes("…"), "超长摘要必须截断");

  const unordered = buildBookStateSnapshotLines(
    [
      { chapterOrder: 6, title: "后", summary: "s" },
      { chapterOrder: 2, title: "前", summary: "s" },
      { chapterOrder: 99, title: "未来", summary: "s" },
    ],
    8,
  );
  assert.equal(unordered.length, 2, "乱序输入先排序再过滤未来事件");
  assert.ok(unordered[0].startsWith("第2章") && unordered[1].startsWith("第6章"));
});

test("卷定位与卷内回顾:命中卷返回章序,回顾只含当前章之前的章节", () => {
  const volumeRows = [
    { chapters: [{ chapterOrder: 1 }, { chapterOrder: 2 }] },
    { chapters: [{ chapterOrder: 3 }, { chapterOrder: 4 }, { chapterOrder: 5 }] },
  ];
  assert.deepEqual(resolveCurrentVolumeChapterOrders(volumeRows, 4), [3, 4, 5]);
  assert.equal(resolveCurrentVolumeChapterOrders(volumeRows, 99), null, "未覆盖的章返回 null");

  const rows = [1, 2, 3, 4].map((order) => ({ summary: `第${order}章摘要`, chapter: { order } }));
  const recap = buildVolumeRecapLines(rows, 4);
  assert.deepEqual(recap.map((line) => line.slice(0, 3)), ["第1章", "第2章", "第3章"], "不包含当前章");
  assert.equal(buildVolumeRecapLines(rows.slice(0, 3), 1).length, 0, "首章无回顾");
});

test("writer 资产登记两组上下文且进入 preferredGroups", () => {
  const asset = findRegisteredPromptAssetById("novel.chapter.writer");
  assert.ok(asset, "novel.chapter.writer 必须已注册");
  const requirements = asset.contextRequirements.map((entry) => entry.group);
  assert.ok(requirements.includes("book_state_snapshot"), "writer 需求必须登记全书快照组");
  assert.ok(requirements.includes("volume_recap"), "writer 需求必须登记卷内回顾组");
  for (const group of ["book_state_snapshot", "volume_recap"]) {
    assert.ok(asset.contextPolicy.preferredGroups.includes(group), `${group} 必须进 preferredGroups 防预算丢弃`);
  }
});

test("块装配与数据管道静态契约", () => {
  const blocksSource = readSource("prompting", "prompts", "novel", "context", "chapterContextBlocks.ts");
  assert.match(blocksSource, /id: "book_state_snapshot"/, "必须存在全书快照块");
  assert.match(blocksSource, /id: "volume_recap"/, "必须存在卷内回顾块");
  assert.match(blocksSource, /mode === "full" && \(writeContext\.bookStateSnapshot \?\? \[\]\)\.length > 0/, "快照块按 full 模式且有数据门控");
  assert.match(blocksSource, /mode === "full" && \(writeContext\.volumeRecap \?\? \[\]\)\.length > 0/, "回顾块按 full 模式且有数据门控");

  const assemblerSource = readSource("services", "novel", "runtime", "GenerationContextAssembler.ts");
  assert.ok(assemblerSource.includes("volumeRecap,"), "装配器必须把卷内回顾写入 contextPackage");
  assert.ok(assemblerSource.includes("bookStateSnapshot,"), "装配器必须把全书快照写入 contextPackage");
  assert.match(assemblerSource, /buildBookStateSnapshotLines\(canonicalState\.timeline/, "快照必须来自 canonical 时间线");
});

test("provider contracts:后段有数据即纳入,缺数据按降级记录,早期章节不评估", () => {
  for (const id of ["book_state_snapshot", "volume_recap"]) {
    const contract = CHAPTER_CONTEXT_PROVIDER_CONTRACTS.find((item) => item.id === id);
    assert.ok(contract, `${id} 契约必须存在`);
    assert.deepEqual([...contract.stages], ["write"]);
    assert.equal(contract.failureSemantics, "degrade");
    assert.equal(contract.required, false);
  }

  const basePackage = {
    characterRoster: [],
    characterHardFacts: [],
    plan: {},
    chapterMission: {},
    previousChapterTail: null,
    previousChaptersSummary: [],
    storyWorldSlice: null,
    ragContext: "",
  };

  const lateWithSnapshot = evaluateChapterContextProviderContracts({
    stage: "write",
    chapterOrder: 6,
    contextPackage: { ...basePackage, bookStateSnapshot: ["第1章 开局: 主角接到任务"], volumeRecap: [] },
  });
  const snapshotDecision = lateWithSnapshot.find((item) => item.blockId === "book_state_snapshot");
  const recapDecision = lateWithSnapshot.find((item) => item.blockId === "volume_recap");
  assert.equal(snapshotDecision?.included, true, "后段章节有快照即纳入");
  assert.equal(recapDecision?.included, false, "后段章节缺回顾按降级记录");
  assert.match(recapDecision?.reason ?? "", /后段章节缺少卷内回顾/);

  const early = evaluateChapterContextProviderContracts({
    stage: "write",
    chapterOrder: 2,
    contextPackage: { ...basePackage, bookStateSnapshot: [], volumeRecap: [] },
  });
  assert.equal(early.some((item) => item.blockId === "book_state_snapshot"), false, "早期章节不评估快照");
  assert.equal(early.some((item) => item.blockId === "volume_recap"), false, "早期章节不评估回顾");
});
