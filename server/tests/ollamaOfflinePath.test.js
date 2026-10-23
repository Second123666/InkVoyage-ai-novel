const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { z } = require("zod");

// INN-D2 本机模型离线路径守卫(LOOP-18 · docs/plans/local-model-offline.md)
require("../dist/app.js");
const {
  PROVIDERS,
  providerRequiresApiKey,
  resolveProviderBaseUrl,
} = require("../dist/llm/providers.js");
const { getJsonCapability } = require("../dist/llm/capabilities.js");
const { resolveModelsEndpoint } = require("../dist/llm/modelCatalog.js");
const {
  resolveStructuredOutputProfile,
  selectStructuredOutputStrategy,
} = require("../dist/llm/structuredOutput.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("Ollama 免密钥就绪:默认地址与可用性判断", () => {
  assert.equal(providerRequiresApiKey("ollama"), false);
  assert.equal(PROVIDERS.ollama.baseURL, "http://127.0.0.1:11434/v1");
  assert.equal(resolveProviderBaseUrl("ollama"), "http://127.0.0.1:11434/v1");
  assert.equal(
    resolveModelsEndpoint("http://127.0.0.1:11434/v1"),
    "http://127.0.0.1:11434/v1/models",
  );
});

test("Ollama 结构化输出走 prompt_json,不强制 JSON 模式", () => {
  const capability = getJsonCapability("ollama", "qwen3:8b");
  assert.deepEqual(capability, { supportsJsonObject: false, supportsJsonSchema: false });

  const profile = resolveStructuredOutputProfile({
    provider: "ollama",
    model: "qwen3:8b",
    requestProtocol: "openai_compatible",
    executionMode: "structured",
  });
  assert.equal(profile.family, "ollama");
  assert.equal(profile.preferredStructuredStrategy, "prompt_json");

  const strategy = selectStructuredOutputStrategy(profile, z.object({ status: z.literal("ok") }));
  assert.equal(strategy, "prompt_json");
});

test("Ollama 兼容层接线:原生模型目录优先、工厂免密钥兜底", () => {
  const catalog = readSource("llm", "modelCatalog.ts");
  assert.match(catalog, /\/api\/tags/, "模型目录优先读取 Ollama 原生 /api/tags");
  assert.match(catalog, /Fall back to the OpenAI-compatible models endpoint/, "原生目录失败时回退 OpenAI 兼容端点");

  const factory = readSource("llm", "factory.ts");
  assert.match(factory, /apiKey: resolved\.apiKey \?\? "ollama"/, "未配置密钥时使用本地占位密钥");

  const structured = readSource("llm", "structuredOutput.ts");
  assert.match(structured, /input\.provider === "ollama"/);
  assert.match(structured, /family: "ollama"/);
});
