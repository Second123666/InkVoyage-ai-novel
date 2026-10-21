import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  CHAPTER_STATUS_META,
  buildProductionBoardModel,
} from "../src/pages/novels/productionBoard/productionBoardModel.ts";
import {
  MOBILE_ROUTE_PATTERNS,
  getMobilePageTitle,
  getMobileRouteClassName,
} from "../src/components/layout/mobile/mobileSiteNavigation.ts";

// INN-C2 生产看板守卫:聚合模型 + 路由/入口/移动端合同。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function chapter(overrides = {}) {
  return {
    id: "c",
    order: 1,
    title: "章节",
    status: "waiting_writing",
    wordCount: 0,
    qualityDebt: null,
    ...overrides,
  };
}

function debt(codes, extra = {}) {
  return {
    source: "quality_loop",
    evaluatedAt: "2026-10-20T00:00:00.000Z",
    repairAttemptsUsed: 1,
    repairAttemptsAllowed: 1,
    reason: "正文存在结构问题",
    issueCodes: codes,
    ...extra,
  };
}

test("看板聚合:状态分布含零项、待处理按严重度优先、债务热点按问题数取前 5", () => {
  const chapters = [
    chapter({ id: "c1", order: 1, status: "completed", wordCount: 3000 }),
    chapter({ id: "c2", order: 2, status: "quality_debt", qualityDebt: debt(["A", "B", "C"]) }),
    chapter({ id: "c3", order: 3, status: "error" }),
    chapter({ id: "c4", order: 4, status: "replan_required" }),
    chapter({ id: "c5", order: 5, status: "quality_debt", qualityDebt: debt(["A"]) }),
    chapter({ id: "c6", order: 6, status: "waiting_planning" }),
  ];
  const model = buildProductionBoardModel({
    chapters,
    volumes: [
      { id: "v1", sortOrder: 1, title: "第一卷", chapters: [{ chapterOrder: 1 }, { chapterOrder: 2 }, { chapterOrder: 3 }] },
      { id: "v2", sortOrder: 2, title: "第二卷", chapters: [{ chapterOrder: 4 }, { chapterOrder: 5 }] },
    ],
  });

  assert.equal(model.totalChapters, 6);
  assert.equal(model.totalWordCount, 3000);
  assert.equal(model.statusCounts.length, Object.keys(CHAPTER_STATUS_META).length, "状态分布必须覆盖全部状态(含零项)");
  const errorCount = model.statusCounts.find((item) => item.status === "error");
  assert.equal(errorCount.count, 1);
  assert.equal(model.statusCounts.find((item) => item.status === "generating").count, 0, "零项保留");

  assert.deepEqual(
    model.attentionChapters.map((item) => item.order),
    [3, 4, 2, 5],
    "待处理顺序:error → replan_required → quality_debt,同组按章序",
  );

  assert.deepEqual(
    model.debtHotspots.map((item) => [item.order, item.issueCodes.length]),
    [[2, 3], [5, 1]],
    "债务热点按问题数降序",
  );
  assert.equal(model.debtHotspots[0].reason, "正文存在结构问题");

  assert.equal(model.volumeProgress.length, 2);
  assert.equal(model.volumeProgress[0].completedChapters, 1);
  assert.equal(model.volumeProgress[0].attentionChapters, 2);
  assert.equal(Math.round(model.volumeProgress[0].ratio * 100), 33);
  assert.equal(model.unassignedChapterCount, 1, "第 6 章未挂卷计划");

  const empty = buildProductionBoardModel({ chapters: [], volumes: [] });
  assert.equal(empty.totalChapters, 0);
  assert.equal(empty.completionRatio, 0);
  assert.deepEqual(empty.attentionChapters, []);
  assert.deepEqual(empty.debtHotspots, []);
});

test("看板路由、入口与页面装配", async () => {
  const router = await read("src/router/index.tsx");
  assert.match(router, /import\("@\/pages\/novels\/productionBoard\/ProductionBoardPage"\)/, "看板页必须懒加载注册");
  assert.match(router, /path: "novels\/:id\/production-board", element: <ProductionBoardPage \/>/, "看板路由必须挂载");

  const page = await read("src/pages/novels/productionBoard/ProductionBoardPage.tsx");
  assert.match(page, /getSimpleCreationShelf/, "章节状态/字数/债务必须复用简单创作台投影");
  assert.match(page, /getNovelVolumeWorkspace/, "卷进度必须复用卷工作区投影");
  assert.doesNotMatch(page, /getNovelDetail/, "详情接口的章节不含状态、字数与债务,不能作为看板数据源");
  assert.match(page, /buildProductionBoardModel/, "看板必须经纯函数模型聚合");

  const editView = await read("src/pages/novels/components/NovelEditView.tsx");
  assert.match(editView, /\/novels\/\$\{id\}\/production-board/, "小说工作区的项目工具必须提供看板入口");
});

test("移动端合同:路由元数据与 CSS 落点齐全", async () => {
  const route = MOBILE_ROUTE_PATTERNS.find((item) => item.key === "production-board");
  assert.ok(route, "必须登记 production-board 路由模式");
  assert.equal(getMobilePageTitle("/novels/demo/production-board"), "生产看板");
  assert.equal(getMobileRouteClassName("/novels/demo/production-board"), "mobile-route-production-board");
  assert.equal(route.group, "novels");

  const css = await read("src/index.css");
  assert.match(css, /\.mobile-route-production-board(?:[\s,.>{:#\[])/, "必须有专属移动端 CSS 落点");
});
