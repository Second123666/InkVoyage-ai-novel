import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { resolveWorldGuidance } from "../src/pages/worlds/worldGuidance.ts";

// UI-1 第三批 C · 世界样本引导守卫(LOOP-34)
// 规则:状态分档、可用步骤按资产推导、下一步动作确定性优先级。

test("世界引导:四项全齐 → 较完整,四步可用,推荐推送", () => {
  const guidance = resolveWorldGuidance({ ruleCount: 2, forceCount: 3, locationCount: 4, relationCount: 1 });
  assert.equal(guidance.status, "较完整");
  assert.equal(guidance.statusTone, "success");
  assert.deepEqual(guidance.usableSteps, ["正文生成", "角色准备", "卷战略 / 卷骨架", "节奏 / 拆章"]);
  assert.equal(guidance.nextAction, "推送到小说作为本书世界底板");
});

test("世界引导:空世界 → 未整理,无可用步骤,优先补规则", () => {
  const guidance = resolveWorldGuidance({ ruleCount: 0, forceCount: 0, locationCount: 0, relationCount: 0 });
  assert.equal(guidance.status, "未整理");
  assert.equal(guidance.statusTone, "warning");
  assert.deepEqual(guidance.usableSteps, []);
  assert.equal(guidance.nextAction, "补充核心世界规则");
});

test("世界引导:下一步按规则→势力→地点→关系的确定性优先级", () => {
  assert.equal(
    resolveWorldGuidance({ ruleCount: 0, forceCount: 3, locationCount: 3, relationCount: 3 }).nextAction,
    "补充核心世界规则",
  );
  assert.equal(
    resolveWorldGuidance({ ruleCount: 1, forceCount: 0, locationCount: 3, relationCount: 3 }).nextAction,
    "补充主要势力",
  );
  assert.equal(
    resolveWorldGuidance({ ruleCount: 1, forceCount: 1, locationCount: 0, relationCount: 3 }).nextAction,
    "标记故事地点",
  );
  assert.equal(
    resolveWorldGuidance({ ruleCount: 1, forceCount: 1, locationCount: 1, relationCount: 0 }).nextAction,
    "整理势力与地点关系",
  );
});

test("世界引导:可用步骤只包含已具备资产对应的步骤,且顺序稳定", () => {
  const guidance = resolveWorldGuidance({ ruleCount: 0, forceCount: 2, locationCount: 0, relationCount: 3 });
  assert.deepEqual(guidance.usableSteps, ["角色准备", "节奏 / 拆章"]);
  assert.equal(guidance.status, "可起步");
});

test("世界列表接入引导:卡片展示状态、可用步骤与下一步", async () => {
  const source = await readFile(new URL("../src/pages/worlds/WorldList.tsx", import.meta.url), "utf8");
  assert.match(source, /resolveWorldGuidance\(/, "必须调用纯函数引导");
  assert.match(source, /guidance\.status/, "卡片展示状态");
  assert.match(source, /guidance\.usableSteps/, "卡片展示可用步骤");
  assert.match(source, /guidance\.nextAction/, "卡片展示下一步动作");
});
