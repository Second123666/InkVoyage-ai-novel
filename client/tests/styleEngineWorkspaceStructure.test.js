import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// UI-1 第三批结构终态守卫(LOOP-37)
// 规则:编辑/应用测试/去AI味三态是页面内常驻工作区,不再用 88vh/84vh 超大弹窗;
// 创建流程保留模态;焦点 ref 仍挂载到工作区容器。

const page = await readFile(new URL("../src/pages/writingFormula/WritingFormulaPage.tsx", import.meta.url), "utf8");

test("写法引擎不再用超大弹窗承载三套工作面板", () => {
  assert.doesNotMatch(page, /h-\[88vh\]/, "编辑工作区不得再用 88vh 弹窗");
  assert.doesNotMatch(page, /h-\[84vh\]/, "应用/净稿不得再用 84vh 弹窗");
  assert.doesNotMatch(page, /<DialogContent/, "页面不得再用 DialogContent 承载工作面板");
});

test("写法引擎存在常驻工作区并按视图切换", () => {
  assert.match(page, /activeWorkspaceDialog \? \(/, "工作区应按状态常驻渲染");
  assert.match(page, /aria-label="写法工作区"/, "工作区应有可访问标识");
  assert.match(page, /WORKSPACE_VIEW_META/, "应有视图元信息");
  assert.match(page, /setActiveWorkspaceDialog\(view\)/, "应支持视图切换");
  assert.match(page, /setActiveWorkspaceDialog\(null\)/, "应支持关闭工作区");
  // 三个面板都在工作区内渲染
  assert.match(page, /WritingFormulaAdvancedWorkspace/);
  assert.match(page, /WritingFormulaWorkbenchPanel/);
  assert.match(page, /WritingFormulaCleanPanel/);
});

test("编辑工作区保留焦点契约与创建弹窗", () => {
  assert.match(page, /ref=\{activeWorkspaceDialog === "editor" \? editorDialogRef : undefined\}/, "编辑视图应挂载焦点 ref");
  assert.match(page, /useWritingFormulaDialogFocus/, "应复用焦点 hook");
  assert.match(page, /<WritingFormulaCreateDialog/, "创建流程应保留模态弹窗");
});
