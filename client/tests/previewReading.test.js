import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  buildPreviewEditRecommendation,
  buildReadingProgress,
  resolveRecommendationRoute,
} from "../src/pages/novels/previewReading.ts";

// UI-1 第五批 · 预览页阅读进度与编辑器推荐(LOOP-40)

test("阅读进度:按当前章序与总章数计算", () => {
  const p = buildReadingProgress({ activeOrder: 3, totalChapters: 12 });
  assert.equal(p.percent, 25);
  assert.equal(p.progressLabel, "第 3 章 / 共 12 章");
  assert.equal(p.percentLabel, "25%");
});

test("阅读进度:边界情况(无当前章/无章节/超界)", () => {
  assert.equal(buildReadingProgress({ activeOrder: null, totalChapters: 10 }).percent, 0);
  assert.equal(buildReadingProgress({ activeOrder: null, totalChapters: 10 }).progressLabel, "共 10 章");
  assert.equal(buildReadingProgress({ activeOrder: 1, totalChapters: 0 }).progressLabel, "暂无可读章节");
  const full = buildReadingProgress({ activeOrder: 5, totalChapters: 5 });
  assert.equal(full.percent, 100);
  const over = buildReadingProgress({ activeOrder: 99, totalChapters: 10 });
  assert.equal(over.percent, 100, "百分比应封顶 100");
});

test("编辑推荐:有当前章则推荐该章,否则进入工作区", () => {
  const withChapter = buildPreviewEditRecommendation({ activeChapterId: "c1", activeOrder: 7 });
  assert.equal(withChapter.kind, "chapter");
  assert.equal(withChapter.label, "继续编辑第 7 章");
  assert.equal(resolveRecommendationRoute("n1", withChapter), "/novels/n1/chapters/c1");

  const withoutOrder = buildPreviewEditRecommendation({ activeChapterId: "c1", activeOrder: null });
  assert.equal(withoutOrder.kind, "chapter");
  assert.equal(withoutOrder.label, "编辑当前章节");

  const workspace = buildPreviewEditRecommendation({ activeChapterId: null, activeOrder: null });
  assert.equal(workspace.kind, "workspace");
  assert.equal(resolveRecommendationRoute("n1", workspace), "/novels/n1/edit");
});

test("预览页接入阅读进度与推荐动作", async () => {
  const source = await readFile(new URL("../src/pages/novels/NovelPreview.tsx", import.meta.url), "utf8");
  assert.match(source, /buildReadingProgress\(/, "必须计算阅读进度");
  assert.match(source, /阅读进度/, "页面展示阅读进度");
  assert.match(source, /buildPreviewEditRecommendation\(/, "必须计算编辑推荐");
  assert.match(source, /resolveRecommendationRoute\(/, "推荐动作必须拼接目标路由");
  assert.match(source, /editRecommendation\.label/, "展示推荐动作文案");
});
