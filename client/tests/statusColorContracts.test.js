import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// UI-1 第六批 · 小说工作台状态组件色守卫(LOOP-42)
// 规则:章节执行流、流水线标签页、伏笔账本卡的状态一律语义 token,不得残留调色板状态色。

const targets = [
  "../src/pages/novels/components/ChapterExecutionStatusFlow.tsx",
  "../src/pages/novels/components/PipelineTab.tsx",
  "../src/pages/novels/components/BookPayoffLedgerCard.tsx",
  "../src/pages/novels/components/OutlineTab.tsx",
  "../src/pages/novels/components/StructuredChapterListCard.tsx",
  "../src/pages/novels/components/CharacterDynamicsSection.tsx",
  "../src/pages/novels/components/chapterInsights/TimelinePanel.tsx",
  "../src/pages/novels/components/chapterInsights/ChapterExecutionReferencePanel.tsx",
  "../src/pages/novels/components/characterWorkspace/CharacterOverviewTab.tsx",
  "../src/pages/novels/components/cover/NovelCoverDialog.tsx",
  "../src/pages/novels/components/cover/NovelCoverCard.tsx",
];

const PALETTE = /(?:slate|amber|emerald|sky|rose|red|green|violet)-[0-9]{2,3}|bg-white|text-slate|border-slate|ring-slate/;

test("小说工作台状态组件使用语义 token", async () => {
  const offenders = [];
  for (const rel of targets) {
    const source = await readFile(new URL(rel, import.meta.url), "utf8");
    source.split(/\r?\n/).forEach((line, index) => {
      if (PALETTE.test(line)) {
        offenders.push(`${rel.split("/components/").pop()}:${index + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `以下行需改用语义 token:${offenders.join(", ")}`);
});

test("状态语义正确:进行中/完成/逾期/已兑现/失败各有 token", async () => {
  const flow = await readFile(new URL(targets[0], import.meta.url), "utf8");
  assert.match(flow, /border-info\/40 bg-info\/10 text-info/, "进行中用 info");
  assert.match(flow, /border-success\/40 bg-success\/10 text-success/, "完成用 success");

  const pipeline = await readFile(new URL(targets[1], import.meta.url), "utf8");
  assert.match(pipeline, /text-destructive/, "错误信息用 destructive");
  assert.match(pipeline, /border-success\/30 bg-success\/10/, "完成态用 success");
  assert.match(pipeline, /border-destructive\/40 bg-destructive\/10/, "失败态用 destructive");
  assert.match(pipeline, /bg-warning\/10/, "缺角色提示用 warning");

  const ledger = await readFile(new URL(targets[2], import.meta.url), "utf8");
  assert.match(ledger, /border-warning\/40 bg-warning\/10 text-warning/, "逾期用 warning");
  assert.match(ledger, /border-success\/40 bg-success\/10 text-success/, "已兑现用 success");
});

test("风险分级与统计 tone 也使用语义 token", async () => {
  const dynamics = await readFile(new URL(targets[5], import.meta.url), "utf8");
  assert.match(dynamics, /border-destructive\/40/, "高风险用 destructive");
  assert.match(dynamics, /border-warning\/40/, "警告用 warning");
  assert.match(dynamics, /border-info\/40/, "提示用 info");

  const timeline = await readFile(new URL(targets[6], import.meta.url), "utf8");
  assert.match(timeline, /border-destructive\/30 bg-destructive\/10/, "时间线危险用 destructive");
  assert.match(timeline, /border-success\/30 bg-success\/10/, "时间线正常用 success");

  const overview = await readFile(new URL(targets[8], import.meta.url), "utf8");
  assert.match(overview, /text-success bg-success\/10 border-success\/10|success/, "统计 tone 用 success");
  assert.match(overview, /text-info|text-destructive|text-warning/, "统计 tone 覆盖 info/destructive/warning");
});
