import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  MODEL_ROUTE_GROUP_ORDER,
  MODEL_ROUTE_LABELS,
  resolveModelRouteGroup,
} from "../src/pages/settings/modelRouteLabels.ts";

// UI-1 第三批 D · 模型路由分组守卫(LOOP-35)
// 规则:按开书/规划/正文/审核/资料处理分组,全部任务类型都有归属,页面按组渲染。

test("模型路由分组覆盖全部任务类型", () => {
  const allTaskTypes = Object.keys(MODEL_ROUTE_LABELS);
  for (const taskType of allTaskTypes) {
    const group = resolveModelRouteGroup(taskType);
    assert.ok(MODEL_ROUTE_GROUP_ORDER.includes(group), `${taskType} 未落入任何已定义分组`);
  }
});

test("模型路由分组语义:规划、正文、审校、资料处理归位", () => {
  assert.equal(resolveModelRouteGroup("state_resolution"), "开书设定");
  assert.equal(resolveModelRouteGroup("planner"), "规划推进");
  assert.equal(resolveModelRouteGroup("replan"), "规划推进");
  assert.equal(resolveModelRouteGroup("writer"), "正文生产");
  assert.equal(resolveModelRouteGroup("repair"), "正文生产");
  assert.equal(resolveModelRouteGroup("review"), "审校把关");
  assert.equal(resolveModelRouteGroup("light_review"), "审校把关");
  assert.equal(resolveModelRouteGroup("critical_review"), "审校把关");
  assert.equal(resolveModelRouteGroup("summary"), "资料加工");
  assert.equal(resolveModelRouteGroup("fact_extraction"), "资料加工");
  assert.equal(resolveModelRouteGroup("chat"), "灵感对话");
});

test("模型路由分组:未知任务类型回退到规划推进", () => {
  assert.equal(resolveModelRouteGroup("not_a_real_task"), "规划推进");
});

test("模型路由分组:rollout 五个具名分组均存在", () => {
  for (const name of ["开书设定", "规划推进", "正文生产", "审校把关", "资料加工"]) {
    assert.ok(MODEL_ROUTE_GROUP_ORDER.includes(name), `缺少分组 ${name}`);
  }
});

test("模型路由页按分组渲染路由卡", async () => {
  const source = await readFile(new URL("../src/pages/settings/ModelRoutesPage.tsx", import.meta.url), "utf8");
  assert.match(source, /renderRouteCard\(/, "必须抽出路由卡渲染函数");
  assert.match(source, /MODEL_ROUTE_GROUP_ORDER/, "必须按分组顺序渲染");
  assert.match(source, /resolveModelRouteGroup\(/, "必须使用分组解析函数");
  assert.match(source, /groupedJsx/, "必须渲染分组结构");
});
