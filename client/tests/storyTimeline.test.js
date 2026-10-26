import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  buildStoryTimelineGraph,
  TIMELINE_STATUS_META,
} from "../src/pages/novels/storyTimeline/storyTimelineLayout.ts";
import {
  MOBILE_ROUTE_PATTERNS,
  getMobilePageTitle,
  getMobileRouteClassName,
} from "../src/components/layout/mobile/mobileSiteNavigation.ts";

// UI-7 故事时间线守卫:章节分列布局、事件依赖边、路由与移动端合同。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function event(overrides = {}) {
  return {
    id: "e1",
    novelId: "n1",
    eventOrder: 1,
    chapterId: null,
    chapterIndex: 1,
    storyDayIndex: null,
    storyTimeLabel: null,
    title: "事件",
    summary: "摘要",
    type: "plot",
    status: "occurred",
    visibility: "reader_known",
    source: "chapter_extraction",
    participantIds: [],
    locationId: null,
    factionIds: [],
    prerequisiteEventIds: [],
    consequenceEventIds: [],
    stateChanges: [],
    eventKey: null,
    confidence: 1,
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    ...overrides,
  };
}

test("时间线布局:按章节分列、按事件序排列、未挂章单列", () => {
  const graph = buildStoryTimelineGraph([
    event({ id: "e3", chapterIndex: 2, eventOrder: 30, title: "第三章事件" }),
    event({ id: "e1", chapterIndex: 1, eventOrder: 10, title: "第一章事件" }),
    event({ id: "e4", chapterIndex: null, eventOrder: 40, title: "未挂章事件" }),
    event({ id: "e2", chapterIndex: 1, eventOrder: 20, title: "第一章后段事件" }),
  ]);

  assert.deepEqual(
    graph.nodes.map((node) => [node.id, node.chapterLabel]),
    [
      ["e1", "第 1 章"],
      ["e2", "第 1 章"],
      ["e3", "第 2 章"],
      ["e4", "未挂章"],
    ],
    "节点按章节列 → 事件序排列,未挂章置于最后一列",
  );
  assert.equal(graph.nodes[0].x, 0);
  assert.equal(graph.nodes[1].x, 0, "同章事件共享列坐标");
  assert.equal(graph.nodes[0].y, 0);
  assert.equal(graph.nodes[1].y > graph.nodes[0].y, true, "同章事件按行下移");
  assert.equal(graph.nodes[2].x > graph.nodes[0].x, true, "章节列从左到右");
  assert.equal(TIMELINE_STATUS_META.occurred.label, "已发生");
});

test("时间线布局:前置与后续依赖边去重且只连存在的事件", () => {
  const graph = buildStoryTimelineGraph([
    event({ id: "a", eventOrder: 1, consequenceEventIds: ["b"] }),
    event({ id: "b", eventOrder: 2, prerequisiteEventIds: ["a"], consequenceEventIds: ["missing"] }),
    event({ id: "c", eventOrder: 3, prerequisiteEventIds: ["missing"] }),
  ]);

  assert.deepEqual(
    graph.edges.map((edge) => [edge.id, edge.kind]).sort(),
    [["a->b", "prerequisite"]],
    "同一对事件只保留一条边,缺失目标不生成边",
  );
  assert.deepEqual(buildStoryTimelineGraph([]), { nodes: [], edges: [] });
});

test("时间线接入:路由、懒加载画布、移动端合同与只读 API", async () => {
  const router = await read("src/router/index.tsx");
  assert.match(router, /import\("@\/pages\/novels\/storyTimeline\/StoryTimelinePage"\)/, "时间线页必须懒加载注册");
  assert.match(router, /path: "novels\/:id\/story-timeline", element: <StoryTimelinePage \/>/, "时间线路由必须挂载");

  const page = await read("src/pages/novels/storyTimeline/StoryTimelinePage.tsx");
  assert.match(page, /lazy\(\(\) => import\("\.\/StoryTimelineCanvas"\)\)/, "时间线画布必须按需懒加载");
  assert.match(page, /getStoryTimeline/, "页面必须走只读时间线 API");
  assert.doesNotMatch(page, /from "recharts"|from "@xyflow\/react"/, "页面主界面不得直接引入可视化依赖");

  const api = await read("src/api/storyTimeline.ts");
  assert.match(api, /\/story-timeline\/\$\{novelId\}/, "API 路径必须是只读时间线端点");

  const route = MOBILE_ROUTE_PATTERNS.find((item) => item.key === "story-timeline");
  assert.ok(route, "必须登记 story-timeline 路由模式");
  assert.equal(getMobilePageTitle("/novels/demo/story-timeline"), "故事时间线");
  assert.equal(getMobileRouteClassName("/novels/demo/story-timeline"), "mobile-route-story-timeline");
  const css = await read("src/index.css");
  assert.match(css, /\.mobile-route-story-timeline(?:[\s,.>{:#\[])/, "必须有专属移动端 CSS 落点");
});
