import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// UI-1 第五批 · 帮助页视觉合同守卫(LOOP-39)
// 规则:帮助页作为新手任务导航,Hero 必须随明暗主题适配(不得硬编码深色底/白字/装饰光斑),
// 状态与强调一律使用语义 token。

const source = await readFile(new URL("../src/pages/help/HelpPage.tsx", import.meta.url), "utf8");

test("帮助页不含硬编码深色 Hero 与调色板色", () => {
  assert.doesNotMatch(source, /bg-\[#122033\]/, "Hero 不得硬编码深色底");
  assert.doesNotMatch(source, /text-white|bg-white|text-slate-/, "Hero 不得写死白字/浅灰字");
  assert.doesNotMatch(source, /text-sky-|border-sky-|bg-sky-|blur-3xl/, "Hero 不得用 sky 色与装饰光斑(无渐变规范)");
  assert.doesNotMatch(
    source,
    /text-emerald-|bg-emerald-|border-emerald-|text-amber-|bg-amber-|border-amber-|text-red-|bg-red-/,
    "里程碑与提示状态必须用语义 token",
  );
});

test("帮助页保留新手任务导航结构", () => {
  assert.match(source, /创作向导/, "保留向导标签");
  assert.match(source, /第一本书路线/, "保留任务路线");
  assert.match(source, /为什么推荐这一步/, "保留推荐理由");
  assert.match(source, /journey\.primaryAction/, "主行动由真实旅程数据驱动");
  assert.match(source, /journey\.milestones/, "保留里程碑列表");
});

test("帮助页使用语义状态 token", () => {
  assert.match(source, /border-success bg-success text-success-foreground/, "完成里程碑用 success");
  assert.match(source, /border-warning bg-warning text-warning-foreground/, "需处理里程碑用 warning");
  assert.match(source, /bg-warning\/10/, "需处理行用 warning 底色");
  assert.match(source, /text-warning/, "错误提示用 warning");
});
