import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// INN-A1b 守卫:伏笔卡片的筛选/跳转、窗口行内编辑、同步状态与双轨说明。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("伏笔卡片提供筛选与章节跳转入口", async () => {
  const card = await read("src/pages/novels/components/BookPayoffLedgerCard.tsx");
  assert.match(card, /LEDGER_FILTERS/, "必须提供状态筛选");
  for (const label of ["全部", "待跟进", "逾期", "已回收", "已失效"]) {
    assert.match(card, new RegExp(label), `筛选必须包含 ${label}`);
  }
  assert.match(card, /filteredLedgerItems/, "列表必须消费筛选结果");
  assert.match(card, /\/novels\/\$\{novelId\}\/chapters\/\$\{link\.id\}/, "条目必须可跳到埋设/兑现/最近章节");
  assert.match(card, /埋设章/, "必须展示埋设章入口");
  assert.match(card, /兑现章/, "必须展示兑现章入口");
});

test("伏笔卡片提供窗口行内编辑与同步重建入口", async () => {
  const card = await read("src/pages/novels/components/BookPayoffLedgerCard.tsx");
  assert.match(card, /编辑窗口/, "条目必须支持行内编辑窗口");
  assert.match(card, /保存窗口/, "窗口编辑必须有保存动作");
  assert.match(card, /targetStartChapterOrder:\s*parsePositiveOrder\(editingStartOrder\)/, "保存必须提交起始章");
  assert.match(card, /targetEndChapterOrder:\s*parsePositiveOrder\(editingEndOrder\)/, "保存必须提交截止章");
  assert.match(card, /syncNovelPayoffLedger/, "卡片必须接入手动重建");
  assert.match(card, /重新同步/, "必须提供重新同步按钮");
  assert.match(card, /同步已过期/, "同步过期必须有可见标记");

  const api = await read("src/api/novel/planning.ts");
  assert.match(api, /`\/novels\/\$\{id\}\/payoff-ledger\/sync`/, "API 必须指向只属于对账的同步端点");
});

test("伏笔卡片说明台账与快照的双轨口径", async () => {
  const card = await read("src/pages/novels/components/BookPayoffLedgerCard.tsx");
  assert.match(card, /按当前章节读时计算/, "必须说明逾期按读时计算");
  assert.match(card, /两者不一致时以台账为准/, "必须说明台账为唯一事实源");
});
