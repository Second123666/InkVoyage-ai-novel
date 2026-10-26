import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// UI-2/4/5 收尾守卫(LOOP-46)
// UI-2:主题切换已有,补全局 prefers-reduced-motion 降级。
// UI-4:章节编辑器提供专注模式(隐藏侧栏与 AI 面板)。
// UI-5:新访客(无小说)首屏一屏理解产品与开始动作。

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("UI-2:全局尊重系统减少动态效果偏好", async () => {
  const css = await read("src/index.css");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, "必须声明 reduced-motion 媒体查询");
  assert.match(css, /animation-duration: 0\.01ms !important/, "动画需降级");
  assert.match(css, /transition-duration: 0\.01ms !important/, "过渡需降级");
});

test("UI-4:章节编辑器提供专注模式", async () => {
  const shell = await read("src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx");
  assert.match(shell, /focusMode/, "必须有专注模式状态");
  assert.match(shell, /专注写作/, "必须有进入专注的入口");
  assert.match(shell, /退出专注/, "必须有退出专注的入口");
  assert.match(shell, /focusMode\s*\?\s*"grid-cols-1"/, "专注模式收敛为单栏");
  assert.match(shell, /\{!focusMode \? <ChapterEditorSidebar/, "专注模式隐藏侧栏");
  assert.match(shell, /\{!focusMode \? <div className="min-h-0 overflow-hidden">/, "专注模式隐藏 AI 面板");
});

test("UI-5:新访客首屏展示产品介绍与开始动作", async () => {
  const hero = await read("src/pages/home/components/HomeShowcaseHero.tsx");
  assert.match(hero, /AI 驱动的长篇小说生产工作台/, "与公开介绍站表述一致");
  assert.match(hero, /从一句灵感开始，写完一整本长篇/, "一句话说明价值");
  assert.match(hero, /\/novels\/create/, "提供开始动作");
  assert.match(hero, /自动导演主链/, "主链亮点");
  assert.match(hero, /长篇记忆与一致性/, "长篇能力亮点");
  assert.match(hero, /从灵感到成书/, "完成率亮点");

  const home = await read("src/pages/Home.tsx");
  assert.match(home, /HomeShowcaseHero/, "首页必须挂载介绍条");
  assert.match(home, /!novelQuery\.isPending && !hasNovels/, "仅在无小说时展示,避免打扰已有创作");
});
