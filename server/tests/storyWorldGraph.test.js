const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-C1 故事世界图谱守卫(LOOP-13 首轮 · docs/plans/story-world-graph.md)
require("../dist/app.js");
const { prisma } = require("../dist/db/prisma.js");
const {
  STORY_GRAPH_MAX_EDGES,
  STORY_GRAPH_MAX_NODES,
  buildStoryWorldGraph,
  parseStoryWorldSlice,
  storyWorldGraphService,
} = require("../dist/services/novel/state/storyWorldGraph.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

function buildSlice() {
  return {
    activeForces: [
      { id: "f1", name: "地方权贵", summary: "把控本地资源", roleInStory: "主要压迫者" },
      { id: "f2", name: "守夜人", summary: "维持秩序", roleInStory: "灰色盟友" },
    ],
    activeLocations: [{ id: "l1", name: "旧城区", storyUse: "冲突主场" }],
    activeElements: [{ id: "e1", label: "停摆的钟楼", type: "地标" }],
  };
}

test("图谱投影:势力合并去重、关系边过滤、成员取最新轨迹", () => {
  const graph = buildStoryWorldGraph({
    novelId: "novel-1",
    characters: [
      { id: "c1", name: "林序", role: "主角", factionLabel: "守夜人" },
      { id: "c2", name: "陈默", role: "对手" },
      { id: "c3", name: "  ", role: "空名应跳过" },
    ],
    relationStages: [
      { id: "r1", sourceCharacterId: "c1", targetCharacterId: "c2", stageLabel: "警惕同盟", stageSummary: "互相试探", nextTurnPoint: "第一次背叛", isCurrent: true },
      { id: "r2", sourceCharacterId: "c1", targetCharacterId: "c999", stageLabel: "未知角色", isCurrent: true },
      { id: "r3", sourceCharacterId: "c1", targetCharacterId: "c1", stageLabel: "自环", isCurrent: true },
      { id: "r4", sourceCharacterId: "c1", targetCharacterId: "c2", stageLabel: "旧阶段", isCurrent: false },
    ],
    factionTracks: [
      { id: "t1", characterId: "c2", factionLabel: "地方权贵", stanceLabel: "核心成员", updatedAt: "2026-10-20T10:00:00.000Z" },
      { id: "t2", characterId: "c2", factionLabel: "地方权贵", stanceLabel: "外围成员", updatedAt: "2026-10-01T10:00:00.000Z" },
      { id: "t3", characterId: "c1", factionLabel: "守夜人", stanceLabel: "临时合作", updatedAt: "2026-10-19T10:00:00.000Z" },
      { id: "t4", characterId: "c1", factionLabel: "游侠", stanceLabel: "旧身份", updatedAt: "2026-10-18T10:00:00.000Z" },
    ],
    slice: buildSlice(),
  });

  const factionNodes = graph.nodes.filter((node) => node.kind === "faction");
  assert.equal(factionNodes.length, 3, "切片 2 势力 + 轨迹新增 1 势力(‘守夜人’与切片合并,不重复)");
  assert.ok(factionNodes.some((node) => node.label === "游侠"), "轨迹中的新势力生成节点");
  assert.equal(graph.nodes.filter((node) => node.kind === "character").length, 2, "空名角色跳过");
  assert.equal(graph.nodes.filter((node) => node.kind === "location").length, 1);
  assert.equal(graph.nodes.filter((node) => node.kind === "element").length, 1);

  const relationEdges = graph.edges.filter((edge) => edge.kind === "character_relation");
  assert.equal(relationEdges.length, 1, "仅 isCurrent 且双方存在的非自环关系进入图谱");
  assert.equal(relationEdges[0].label, "警惕同盟");
  assert.equal(relationEdges[0].meta.nextTurnPoint, "第一次背叛");

  const membershipEdges = graph.edges.filter((edge) => edge.kind === "faction_membership");
  assert.equal(membershipEdges.length, 3, "c1→守夜人、c1→游侠、c2→地方权贵,每个角色×势力仅一条最新轨迹");
  const c2Edge = membershipEdges.find((edge) => edge.source === "character:c2");
  assert.equal(c2Edge.meta.stanceLabel, "核心成员", "同一角色×势力取最新轨迹");
  const forceEdge = membershipEdges.find((edge) => edge.target.startsWith("faction:force:"));
  assert.ok(forceEdge, "轨迹势力标签命中切片势力时连接到切片节点,而不是重复建点");
});

test("图谱投影:上限截断与统计、空数据兜底", () => {
  const manyCharacters = Array.from({ length: STORY_GRAPH_MAX_NODES + 20 }, (_, index) => ({
    id: `c${index}`,
    name: `角色${String(index).padStart(3, "0")}`,
  }));
  const manyRelations = Array.from({ length: STORY_GRAPH_MAX_EDGES + 30 }, (_, index) => ({
    id: `r${index}`,
    sourceCharacterId: `c${index % manyCharacters.length}`,
    targetCharacterId: `c${(index + 1) % manyCharacters.length}`,
    stageLabel: "关系",
    isCurrent: true,
  }));
  const graph = buildStoryWorldGraph({
    novelId: "novel-2",
    characters: manyCharacters,
    relationStages: manyRelations,
    factionTracks: [],
    slice: null,
  });
  assert.equal(graph.nodes.length, STORY_GRAPH_MAX_NODES, "节点上限");
  assert.ok(graph.edges.length <= STORY_GRAPH_MAX_EDGES, "边不得超过上限(节点截断会连带过滤悬空边)");
  assert.equal(graph.stats.truncated, true);
  assert.equal(graph.stats.totalEdgeCount, manyRelations.length, "截断前的总数保留在 stats");
  assert.equal(graph.coverage.hasSlice, false);

  // 边上限独立验证:节点充足,关系边超限。
  const denseCharacters = Array.from({ length: 60 }, (_, index) => ({ id: `d${index}`, name: `角色${String(index).padStart(3, "0")}` }));
  const denseRelations = Array.from({ length: STORY_GRAPH_MAX_EDGES + 50 }, (_, index) => ({
    id: `dr${index}`,
    sourceCharacterId: `d${index % 60}`,
    targetCharacterId: `d${(index + 1) % 60}`,
    stageLabel: "关系",
    isCurrent: true,
  }));
  const denseGraph = buildStoryWorldGraph({
    novelId: "novel-2b",
    characters: denseCharacters,
    relationStages: denseRelations,
    factionTracks: [],
    slice: null,
  });
  assert.equal(denseGraph.nodes.length, 60);
  assert.equal(denseGraph.edges.length, STORY_GRAPH_MAX_EDGES, "边上限独立生效");

  const empty = buildStoryWorldGraph({
    novelId: "novel-3",
    characters: [],
    relationStages: [],
    factionTracks: [],
    slice: null,
  });
  assert.deepEqual(empty.nodes, []);
  assert.deepEqual(empty.edges, []);
  assert.equal(empty.stats.truncated, false);
});

test("切片解析:损坏 JSON / 结构不符 → null 回退", () => {
  assert.equal(parseStoryWorldSlice(null), null);
  assert.equal(parseStoryWorldSlice("not-json"), null);
  assert.equal(parseStoryWorldSlice(JSON.stringify({ activeForces: [] })), null, "缺字段的结构按损坏处理");
  const valid = parseStoryWorldSlice(JSON.stringify({
    storyId: "s",
    worldId: "w",
    coreWorldFrame: "frame",
    appliedRules: [],
    activeForces: [],
    activeLocations: [],
    activeElements: [],
    conflictCandidates: [],
    pressureSources: [],
    mysterySources: [],
    suggestedStoryAxes: [],
    recommendedEntryPoints: [],
    forbiddenCombinations: [],
    storyScopeBoundary: "boundary",
    metadata: {
      schemaVersion: 1,
      builtAt: "2026-10-20T00:00:00.000Z",
      sourceWorldUpdatedAt: "2026-10-19T00:00:00.000Z",
      storyInputDigest: "digest",
      builtFromStructuredData: true,
      builderMode: "runtime",
    },
  }));
  assert.ok(valid);
  assert.equal(valid.activeForces.length, 0);
});

test("服务取数:查询条件、损坏切片回退与 404(prisma stub)", async () => {
  const restores = [];
  const stub = (model, method, impl) => {
    const original = prisma[model][method];
    prisma[model][method] = impl;
    restores.push(() => {
      prisma[model][method] = original;
    });
  };
  try {
    let novelWhere = null;
    stub("novel", "findUnique", async (args) => {
      novelWhere = args.where;
      return {
        id: "novel-1",
        storyWorldSliceJson: "corrupt-json",
        characters: [{ id: "c1", name: "林序", role: "主角", factionLabel: null }],
      };
    });
    stub("characterRelationStage", "findMany", async (args) => {
      assert.equal(args.where.isCurrent, true, "只取当前关系阶段");
      return [];
    });
    stub("characterFactionTrack", "findMany", async () => []);

    const graph = await storyWorldGraphService.build("novel-1");
    assert.equal(novelWhere.id, "novel-1");
    assert.equal(graph.coverage.hasSlice, false, "损坏切片按空切片回退");
    assert.equal(graph.stats.characterCount, 1);

    stub("novel", "findUnique", async () => null);
    await assert.rejects(() => storyWorldGraphService.build("missing"), (error) => error.statusCode === 404 || error.status === 404);
  } finally {
    for (const restore of restores) {
      restore();
    }
  }
});

test("静态契约:只读图谱路由与共享类型", () => {
  const route = readSource("routes", "storyGraph.ts");
  assert.match(route, /storyGraphRouter\.get\(\s*"\/:novelId"/, "图谱端点必须是只读 GET");
  assert.doesNotMatch(route, /\.(post|patch|put|delete)\(/, "图谱端点不得提供写操作");

  const app = readSource("app.ts");
  assert.match(app, /app\.use\("\/api\/story-graph", storyGraphRouter\)/, "图谱端点必须挂载");

  const shared = fs.readFileSync(path.resolve(repoRoot, "..", "shared", "types", "storyWorldGraph.ts"), "utf8");
  assert.match(shared, /StoryWorldGraphPayload/, "共享 payload 类型必须存在");
  assert.match(shared, /StoryGraphNodeKind = "character" \| "faction" \| "location" \| "element"/);
});
