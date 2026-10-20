const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-A4 角色弧线追踪守卫(LOOP-9 · docs/plans/character-arc-tracking.md)
require("../dist/app.js");
const { buildCharacterArcEvents } = require("../dist/services/novel/runtime/context/layeredMemoryContext.js");
const {
  CHAPTER_CONTEXT_PROVIDER_CONTRACTS,
  evaluateChapterContextProviderContracts,
} = require("../dist/services/novel/runtime/context/chapterContextProviderContracts.js");
const { findRegisteredPromptAssetById } = require("../dist/prompting/registry.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("角色弧线事件:按角色分组、每角色限量、倒序取最近、缺章序兜底", () => {
  const rows = [
    { characterId: "c1", chapterOrder: 9, title: "演进更新", content: "目标从复仇转向守护" },
    { characterId: "c1", chapterOrder: 7, title: "低谷", content: "信念动摇" },
    { characterId: "c1", chapterOrder: 5, title: "启程", content: "离开村庄" },
    { characterId: "c1", chapterOrder: 2, title: "开篇", content: "更早的事件被限额挤出" },
    { characterId: "c2", chapterOrder: null, title: "无章序事件", content: "内容" },
    { characterId: "", chapterOrder: 1, title: "空角色", content: "应被跳过" },
  ];
  const grouped = buildCharacterArcEvents(rows);
  assert.equal(grouped.c1.length, 3, "每角色最多 3 条");
  assert.ok(grouped.c1[0].includes("第9章"), "输入倒序 → 保留最近事件");
  assert.ok(!grouped.c1.some((line) => line.includes("更早的事件")), "超额旧事件被挤出");
  assert.equal(grouped.c2.length, 1);
  assert.ok(grouped.c2[0].startsWith("第?章"), "缺章序用 ? 兜底");
  assert.equal(grouped[""], undefined, "空 characterId 跳过");

  const longLine = buildCharacterArcEvents([
    { characterId: "c3", chapterOrder: 1, title: "t", content: "长".repeat(300) },
  ]);
  assert.ok(longLine.c3[0].includes("…"), "内容截断");
});

test("writer 资产登记 character_arc 且进入 preferredGroups", () => {
  const asset = findRegisteredPromptAssetById("novel.chapter.writer");
  assert.ok(asset);
  assert.ok(asset.contextRequirements.some((entry) => entry.group === "character_arc"), "writer 需求必须登记角色弧线组");
  assert.ok(asset.contextPolicy.preferredGroups.includes("character_arc"), "角色弧线组必须进 preferredGroups 防预算丢弃");
});

test("块装配与数据管道静态契约", () => {
  const blocksSource = readSource("prompting", "prompts", "novel", "context", "chapterContextBlocks.ts");
  assert.match(blocksSource, /id: "character_arc"/, "必须存在角色弧线块");
  assert.match(blocksSource, /mode === "full" && hasCharacterArcEvents\(writeContext\)/, "弧线块按 full 模式且有数据门控");

  const assemblerSource = readSource("services", "novel", "runtime", "GenerationContextAssembler.ts");
  assert.match(assemblerSource, /buildCharacterArcEvents\(/, "装配器必须构建角色弧线事件");
  assert.ok(assemblerSource.includes("characterArcEvents,"), "装配器必须把弧线事件写入 contextPackage");
  assert.match(assemblerSource, /prisma\.characterTimeline\.findMany/, "弧线数据来自 CharacterTimeline");

  const sharedSource = fs.readFileSync(path.resolve(repoRoot, "..", "shared", "types", "chapterRuntime.ts"), "utf8");
  assert.equal((sharedSource.match(/characterArcEvents/g) || []).length >= 2, true, "package 与 writeContext 两层 schema 都要声明");
});

test("provider contract:后段有弧线即纳入,缺数据按降级,早期不评估", () => {
  const contract = CHAPTER_CONTEXT_PROVIDER_CONTRACTS.find((item) => item.id === "character_arc");
  assert.ok(contract);
  assert.equal(contract.failureSemantics, "degrade");
  assert.equal(contract.required, false);

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

  const lateWithArc = evaluateChapterContextProviderContracts({
    stage: "write",
    chapterOrder: 8,
    contextPackage: { ...basePackage, bookStateSnapshot: [], volumeRecap: [], characterArcEvents: { c1: ["第9章 演进: 目标变化"] } },
  });
  const decision = lateWithArc.find((item) => item.blockId === "character_arc");
  assert.equal(decision?.included, true);

  const lateWithoutArc = evaluateChapterContextProviderContracts({
    stage: "write",
    chapterOrder: 8,
    contextPackage: { ...basePackage, bookStateSnapshot: [], volumeRecap: [], characterArcEvents: {} },
  });
  const degraded = lateWithoutArc.find((item) => item.blockId === "character_arc");
  assert.equal(degraded?.included, false);
  assert.match(degraded?.reason ?? "", /后段章节缺少角色弧线事件/);

  const early = evaluateChapterContextProviderContracts({
    stage: "write",
    chapterOrder: 2,
    contextPackage: { ...basePackage, bookStateSnapshot: [], volumeRecap: [], characterArcEvents: {} },
  });
  assert.equal(early.some((item) => item.blockId === "character_arc"), false, "早期章节不评估");
});
