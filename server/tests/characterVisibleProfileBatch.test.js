const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-D3 批量吞吐:角色外显资料并发批次(LOOP-19 · docs/plans/batch-throughput.md)
require("../dist/app.js");
const {
  runCharacterVisibleProfileBatch,
  VISIBLE_PROFILE_BATCH_CONCURRENCY,
} = require("../dist/services/novel/characterProfile/characterVisibleProfileBatch.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function character(index) {
  return { id: `c${index}`, name: `角色${index}` };
}

function suggestion(characterItem) {
  return {
    characterId: characterItem.id,
    characterName: characterItem.name,
    fields: {},
    skippedFields: {},
    confidence: 0.8,
    warnings: [],
    hasApplicableChanges: true,
  };
}

test("批量外显资料:并发受上限约束且结果保持输入顺序", async () => {
  const characters = Array.from({ length: 9 }, (_, index) => character(index));
  let active = 0;
  let maxActive = 0;

  const outcome = await runCharacterVisibleProfileBatch({
    characters,
    needsProfile: () => true,
    generate: async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      // 越靠前的角色等待越久,完成顺序与输入顺序相反。
      await sleep((9 - Number(item.id.slice(1))) * 8);
      active -= 1;
      return suggestion(item);
    },
  });

  assert.ok(maxActive <= VISIBLE_PROFILE_BATCH_CONCURRENCY, `并发不得超过 ${VISIBLE_PROFILE_BATCH_CONCURRENCY},实际 ${maxActive}`);
  assert.equal(maxActive, VISIBLE_PROFILE_BATCH_CONCURRENCY);
  assert.deepEqual(
    outcome.results.map((item) => item.characterId),
    characters.map((item) => item.id),
    "结果必须按输入角色顺序返回",
  );
  assert.deepEqual(outcome.skippedCharacters, []);
});

test("批量外显资料:已有资料跳过、单个失败不影响其他角色", async () => {
  const characters = [character(1), character(2), character(3), character(4)];
  const outcome = await runCharacterVisibleProfileBatch({
    characters,
    needsProfile: (item) => item.id !== "c2",
    generate: async (item) => {
      if (item.id === "c1") {
        throw new Error("模型返回为空");
      }
      await sleep(2);
      return suggestion(item);
    },
  });

  assert.deepEqual(outcome.results.map((item) => item.characterId), ["c3", "c4"]);
  assert.deepEqual(
    outcome.skippedCharacters.map((item) => [item.characterId, item.reason]),
    [
      ["c1", "模型返回为空"],
      ["c2", "外显资料已较完整"],
    ],
    "跳过项必须按输入顺序返回",
  );
});

test("批量外显资料:自定义并发与空列表", async () => {
  let active = 0;
  let maxActive = 0;
  const outcome = await runCharacterVisibleProfileBatch({
    characters: [character(1), character(2), character(3), character(4)],
    needsProfile: () => true,
    concurrency: 2,
    generate: async (item) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(5);
      active -= 1;
      return suggestion(item);
    },
  });
  assert.equal(maxActive, 2);
  assert.equal(outcome.results.length, 4);

  const empty = await runCharacterVisibleProfileBatch({
    characters: [],
    needsProfile: () => true,
    generate: async (item) => suggestion(item),
  });
  assert.deepEqual(empty, { results: [], skippedCharacters: [] });
});

test("批量外显资料接线:服务复用并发批次且默认上限为 3", () => {
  assert.equal(VISIBLE_PROFILE_BATCH_CONCURRENCY, 3);
  const service = readSource("services", "novel", "characterProfile", "CharacterVisibleProfileService.ts");
  assert.match(service, /runCharacterVisibleProfileBatch/);
  assert.doesNotMatch(
    service,
    /for \(const character of characters\) \{\s*if \(!this\.needsVisibleProfile/,
    "批量生成不得回退为逐角色串行循环",
  );
});
