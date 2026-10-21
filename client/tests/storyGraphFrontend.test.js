import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { computeStoryGraphLayout } from "../src/pages/novels/storyGraph/storyGraphLayout.ts";
import {
  MOBILE_ROUTE_PATTERNS,
  getMobilePageTitle,
  getMobileRouteClassName,
} from "../src/components/layout/mobile/mobileSiteNavigation.ts";

// INN-C1 次轮守卫:布局纯函数 + 懒加载/路由/入口/移动端合同。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("图谱布局:确定性同心环,势力在角色内环,节点坐标唯一", () => {
  const nodes = [
    { id: "f1", kind: "faction" },
    { id: "c1", kind: "character" },
    { id: "c2", kind: "character" },
    { id: "l1", kind: "location" },
    { id: "e1", kind: "element" },
  ];
  const first = computeStoryGraphLayout(nodes);
  const second = computeStoryGraphLayout(nodes);
  assert.deepEqual(first, second, "同一输入布局必须完全一致");

  const distance = (id) => Math.round(Math.hypot(first[id].x, first[id].y));
  assert.ok(distance("f1") < distance("c1"), "势力环半径小于角色环");
  assert.ok(distance("c1") < distance("l1"), "角色环半径小于地点环");
  assert.ok(distance("l1") < distance("e1"), "地点环半径小于要素环");

  const coordinates = new Set(Object.values(first).map((point) => `${point.x},${point.y}`));
  assert.equal(coordinates.size, nodes.length, "同环多节点不得重叠");

  assert.deepEqual(computeStoryGraphLayout([]), {}, "空输入返回空布局");
});

test("懒加载合同:页面按需加载 React Flow 画布,画布独立引入样式", async () => {
  const page = await read("src/pages/novels/storyGraph/StoryGraphPage.tsx");
  assert.match(page, /lazy\(\(\) => import\("\.\/StoryGraphCanvas"\)\)/, "画布必须经 React.lazy 懒加载");
  assert.match(page, /<Suspense/, "懒加载必须有 Suspense 兜底");

  const canvas = await read("src/pages/novels/storyGraph/StoryGraphCanvas.tsx");
  assert.match(canvas, /from "@xyflow\/react"/, "画布使用已定盘的 React Flow 栈");
  assert.match(canvas, /@xyflow\/react\/dist\/style\.css/, "画布必须引入 React Flow 样式");
});

test("路由与入口:图谱页注册且可从角色关系页进入", async () => {
  const router = await read("src/router/index.tsx");
  assert.match(router, /import\("@\/pages\/novels\/storyGraph\/StoryGraphPage"\)/, "图谱页必须懒加载注册");
  assert.match(router, /path: "novels\/:id\/story-graph", element: <StoryGraphPage \/>/, "图谱路由必须挂载");

  const api = await read("src/api/storyGraph.ts");
  assert.match(api, /\/story-graph\/\$\{novelId\}/, "客户端必须调用只读图谱端点");

  const relationsTab = await read("src/pages/novels/components/characterWorkspace/CharacterRelationsTab.tsx");
  assert.match(relationsTab, /\/novels\/\$\{novelId\}\/story-graph/, "角色关系页必须提供图谱入口");
});

test("移动端合同:路由元数据与 CSS 落点齐全", async () => {
  const route = MOBILE_ROUTE_PATTERNS.find((item) => item.key === "story-graph");
  assert.ok(route, "必须登记 story-graph 路由模式");
  assert.equal(getMobilePageTitle("/novels/demo/story-graph"), "故事世界图谱");
  assert.equal(getMobileRouteClassName("/novels/demo/story-graph"), "mobile-route-story-graph");
  assert.equal(route.group, "novels", "属于小说分组");

  const css = await read("src/index.css");
  assert.match(css, /\.mobile-route-story-graph(?:[\s,.>{:#\[])/, "必须有专属移动端 CSS 落点");
});
