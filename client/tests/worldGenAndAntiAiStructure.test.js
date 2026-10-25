import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// UI-1 第三批结构验收守卫(LOOP-36)
// 审计结论:generator 已是多步工作区、anti-ai-rules 已是资产库+工作区两栏结构(上游已达目标)。
// 守卫锁定该结构,防止后续改动回退成"单体大 Card"或单栏堆叠。

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

test("世界生成器是多步工作区而非单体流程", async () => {
  const source = await read("../src/pages/worlds/WorldGenerator.tsx");
  // 分步组件彼此独立,而非把整条流程写进一个渲染块
  assert.match(source, /WorldGeneratorStepOne/, "缺少第 1 步组件");
  assert.match(source, /WorldGeneratorStepTwo/, "缺少第 2 步组件");
  assert.match(source, /WorldGeneratorStepThree/, "缺少第 3 步组件");
  assert.match(source, /useState<1 \| 2 \| 3 \| 4>/, "缺少步骤状态机");
  // 步骤可回退且受前置条件约束
  assert.match(source, /disabled=\{!concept\}/, "概念未生成时应禁用第 2 步");
  assert.match(source, /disabled=\{!skeleton\}/, "骨架未生成时应禁用后续步骤");
  assert.match(source, /onBackToScale=\{\(\) => setStep\(2\)\}/, "应支持返回上一步");
  assert.ok(source.split("setStep(").length - 1 >= 4, "应存在多处步骤切换");
});

test("反 AI 规则是资产库 + 工作区两栏结构", async () => {
  const source = await read("../src/pages/antiAiRules/AntiAiRulesPage.tsx");
  // 资产库(规则列表)与工作区(预览/测试)分栏
  assert.match(source, /xl:grid-cols-\[minmax\(0,1fr\)_420px\]/, "应为左列表右工作区的分栏布局");
  assert.match(source, /<AntiAiRuleList/, "缺少规则资产库列表");
  assert.match(source, /<AntiAiEffectivePreviewCard/, "缺少生效预览工作区");
  assert.match(source, /<AntiAiRuleEffectTestCard/, "缺少效果测试工作区");
  assert.match(source, /<AntiAiRuleDialog/, "缺少规则编辑弹窗");
});
