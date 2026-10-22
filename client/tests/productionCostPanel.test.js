import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  formatCostAmount,
  formatTokenCount,
  resolveTaskTypeLabel,
} from "../src/pages/novels/productionBoard/productionCostFormat.ts";

// INN-D1 成本与预算面板守卫:展示格式 + 看板装配 + 预算读写接口。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("成本展示格式:任务标签、token 分组与小额费用", () => {
  assert.equal(resolveTaskTypeLabel("writer"), "正文生成");
  assert.equal(resolveTaskTypeLabel("planner"), "规划");
  assert.equal(resolveTaskTypeLabel(null), "未分类");
  assert.equal(resolveTaskTypeLabel("custom_task"), "custom_task", "未知任务类型保留原值");

  assert.equal(formatTokenCount(1234567), "1,234,567");
  assert.equal(formatTokenCount(null), "0");
  assert.equal(formatTokenCount(-5), "0");

  assert.equal(formatCostAmount(null), "—");
  assert.equal(formatCostAmount(0), "0");
  assert.equal(formatCostAmount(0.0123456), "0.012346");
  assert.equal(formatCostAmount(12.345), "12.35");
});

test("成本面板:复用到价报告与预算接口,达到预算时给出暂停说明", async () => {
  const panel = await read("src/pages/novels/productionBoard/ProductionCostPanel.tsx");
  assert.match(panel, /getNovelCostReport/, "费用概览必须复用按书成本报表");
  assert.match(panel, /getProductionTokenBudget/, "必须读取本书预算与累计用量");
  assert.match(panel, /saveProductionTokenBudget/, "必须支持保存本书预算");
  assert.match(panel, /已达到本书预算/, "超限时必须说明自动导演会暂停");
  assert.match(panel, /调整预算或清除预算后可继续/, "必须给出恢复方式");
  assert.match(panel, /aria-label="本书 token 预算"/, "预算输入必须可访问");

  const api = await read("src/api/costReport.ts");
  assert.match(api, /\/cost-report\/\$\{novelId\}/);
  assert.match(api, /\/production-budget\/\$\{novelId\}/, "预算读写走独立路由,成本报告保持只读");

  const page = await read("src/pages/novels/productionBoard/ProductionBoardPage.tsx");
  assert.match(page, /<ProductionCostPanel novelId=\{id\} \/>/, "生产看板必须挂载成本与预算面板");

  const keys = await read("src/api/queryKeys.ts");
  assert.match(keys, /costReport: \(id: string, days: number\)/);
  assert.match(keys, /productionBudget: \(id: string\)/);
});
