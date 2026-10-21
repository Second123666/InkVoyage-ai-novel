import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { buildVolumeWorkspaceDiff } from "../src/pages/novels/components/structuredOutline/volumeWorkspaceDiff.ts";

// INN-C3 规划保存 diff 预览守卫:纯 diff 模型 + 保存入口与确认弹窗装配。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function volume(id, title, sortOrder, chapters) {
  return { id, title, sortOrder, summary: "", mainPromise: "", chapters };
}

function chapter(id, chapterOrder, title, extra = {}) {
  return {
    id,
    chapterOrder,
    title,
    summary: "",
    purpose: "",
    exclusiveEvent: "",
    targetWordCount: 2000,
    conflictLevel: 50,
    ...extra,
  };
}

test("规划 diff:识别卷/章节的新增、移除、移动与字段调整", () => {
  const baseline = [
    volume("v1", "第一卷", 1, [
      chapter("c1", 1, "开端"),
      chapter("c2", 2, "转折"),
      chapter("c3", 3, "收束"),
    ]),
    volume("v2", "第二卷", 2, [chapter("c4", 4, "新篇")]),
    volume("v-old", "旧卷", 3, [chapter("c-old", 5, "旧章")]),
  ];
  const draft = [
    volume("v1", "第一卷 · 开端", 1, [
      chapter("c1", 1, "新的开端"),
      chapter("c2", 3, "转折"),
    ]),
    volume("v2", "第二卷", 2, [chapter("c4", 4, "新篇")]),
    volume("v3", "第三卷", 3, [chapter("c5", 5, "新章")]),
  ];

  const diff = buildVolumeWorkspaceDiff({ baseline, draft });

  assert.equal(diff.hasChanges, true);
  assert.deepEqual(diff.addedVolumes.map((item) => item.id), ["v3"]);
  assert.equal(diff.addedVolumes[0].chapterCount, 1);
  assert.deepEqual(diff.removedVolumes.map((item) => item.id), ["v-old"]);
  assert.deepEqual(diff.updatedVolumes.map((item) => item.id), ["v1"]);
  assert.deepEqual(diff.updatedVolumes[0].fields, ["标题"], "卷字段变化必须列出中文标签");

  assert.deepEqual(diff.addedChapters.map((item) => item.id), ["c5"]);
  assert.deepEqual(diff.removedChapters.map((item) => item.id), ["c3", "c-old"]);
  assert.deepEqual(diff.movedChapters.map((item) => [item.id, item.fromOrder, item.toOrder]), [["c2", 2, 3]]);
  assert.deepEqual(diff.updatedChapters.map((item) => [item.id, item.fields]), [["c1", ["标题"]]]);
  assert.equal(diff.totalChangedChapters, 5);
});

test("规划 diff:章节跨卷移动与无改动/空基线", () => {
  const baseline = [
    volume("v1", "第一卷", 1, [chapter("c1", 1, "开场")]),
    volume("v2", "第二卷", 2, []),
  ];
  const movedAcrossVolumes = [
    volume("v1", "第一卷", 1, []),
    volume("v2", "第二卷", 2, [chapter("c1", 1, "开场")]),
  ];
  const movedDiff = buildVolumeWorkspaceDiff({ baseline, draft: movedAcrossVolumes });
  assert.deepEqual(movedDiff.movedChapters.map((item) => [
    item.id,
    item.fromVolumeTitle,
    item.volumeTitle,
  ]), [["c1", "第一卷", "第二卷"]]);
  assert.equal(movedDiff.updatedChapters.length, 0, "跨卷移动不重复计为字段修改");

  const unchanged = buildVolumeWorkspaceDiff({ baseline, draft: baseline });
  assert.equal(unchanged.hasChanges, false);
  assert.equal(unchanged.totalChangedChapters, 0);
  assert.deepEqual(unchanged.addedChapters, []);

  const emptyBaseline = buildVolumeWorkspaceDiff({
    baseline: [],
    draft: [volume("v1", "第一卷", 1, [chapter("c1", 1, "开场")])],
  });
  assert.equal(emptyBaseline.hasChanges, true);
  assert.equal(emptyBaseline.addedVolumes.length, 1);
  assert.equal(emptyBaseline.addedChapters.length, 1);
});

test("保存入口:卷战略与节奏拆章都先经 diff 确认", async () => {
  const edit = await read("src/pages/novels/NovelEdit.tsx");
  assert.match(edit, /usePlanningSavePreview/, "保存门禁必须经独立 hook 装配");
  assert.match(edit, /requestPlanSave\("volume_strategy"\)/, "卷战略保存必须走预览入口");
  assert.match(edit, /requestPlanSave\("structured_outline"\)/, "节奏拆章保存必须走预览入口");
  assert.match(edit, /<VolumeWorkspaceSaveDiffDialog/, "确认弹窗必须挂载在小说工作区");

  const hook = await read("src/pages/novels/hooks/usePlanningSavePreview.ts");
  assert.match(hook, /buildVolumeWorkspaceDiff/, "保存前必须计算草稿与已保存规划的差异");
  assert.match(hook, /savedVolumes\.length === 0 \|\| !diff\.hasChanges/, "无基线或无改动时直接保存,不打断用户");

  const dialog = await read("src/pages/novels/components/structuredOutline/VolumeWorkspaceSaveDiffDialog.tsx");
  assert.match(dialog, /确认保存/, "弹窗必须提供明确的确认动作");
  assert.match(dialog, /onConfirm/, "确认动作必须接回保存");
  assert.match(dialog, /同步到章节执行区/, "节奏拆章保存必须说明会同步章节执行区");
  assert.match(dialog, /不会自动删除/, "必须说明卷纲外章节不会被自动删除");
  assert.match(dialog, /版本历史/, "卷战略保存必须说明会记录规划版本");
});
