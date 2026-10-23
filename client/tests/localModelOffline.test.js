import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  buildLocalOfflineRouteDraft,
  findLocalModelProvider,
  LOCAL_OFFLINE_TASK_TYPES,
} from "../src/pages/settings/modelRoutes.utils.ts";

// INN-D2 本机模型离线预设守卫:审校/摘要任务类型 + 路由页装配 + 免密钥文案。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function localProvider(overrides = {}) {
  return {
    provider: "ollama",
    kind: "builtin",
    name: "Ollama",
    currentModel: "qwen3:8b",
    currentBaseURL: "http://127.0.0.1:11434/v1",
    models: ["qwen3:8b", "llama3.2"],
    requiresApiKey: false,
    isConfigured: true,
    isActive: true,
    ...overrides,
  };
}

test("离线预设:只覆盖审校与摘要,使用本机模型且降低温度", () => {
  assert.deepEqual(LOCAL_OFFLINE_TASK_TYPES, [
    "review",
    "light_review",
    "critical_review",
    "summary",
  ]);
  assert.equal(LOCAL_OFFLINE_TASK_TYPES.includes("writer"), false, "正文生成不进入离线预设");

  const draft = buildLocalOfflineRouteDraft(localProvider());
  assert.deepEqual(draft, {
    provider: "ollama",
    model: "qwen3:8b",
    temperature: "0.3",
    maxTokens: "",
    requestProtocol: "auto",
    structuredResponseFormat: "auto",
  });

  const withoutCurrent = buildLocalOfflineRouteDraft(localProvider({ currentModel: "" }));
  assert.equal(withoutCurrent.model, "qwen3:8b", "没有当前模型时取候选首项");
  assert.equal(buildLocalOfflineRouteDraft(localProvider({ currentModel: "", models: [] })), null);
  assert.equal(buildLocalOfflineRouteDraft(null), null);
});

test("离线预设:只选择已配置且启用的本机厂商", () => {
  assert.equal(findLocalModelProvider([localProvider()])?.provider, "ollama");
  assert.equal(findLocalModelProvider([localProvider({ isActive: false })]), null);
  assert.equal(findLocalModelProvider([localProvider({ isConfigured: false })]), null);
  assert.equal(findLocalModelProvider([
    localProvider({ provider: "deepseek", requiresApiKey: true, isConfigured: true }),
  ]), null);
});

test("路由页装配:一键填入按钮可用且受本机模型可用性约束", async () => {
  const page = await read("src/pages/settings/ModelRoutesPage.tsx");
  assert.match(page, /applyLocalOfflinePreset/, "必须提供离线预设动作");
  assert.match(page, /本机跑审校与摘要/, "按钮文案必须说明用途");
  assert.match(page, /disabled=\{!localOfflineDraft\}/, "没有本机模型时不得套用");
  assert.match(page, /确认后保存/, "必须提醒用户保存后生效");
  assert.match(page, /buildLocalOfflineRouteDraft/, "必须复用纯函数构建路由草稿");
});

test("免密钥文案:本机厂商不提示配置 API Key", async () => {
  const card = await read("src/pages/settings/components/ProviderStatusCard.tsx");
  assert.match(card, /本机模型不需要查询余额/);
  assert.match(card, /先在配置里选择本机模型，再测试连接/);
  assert.match(card, /先启动本地服务并选择模型，再刷新模型列表/);
});
