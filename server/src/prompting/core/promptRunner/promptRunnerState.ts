import { HumanMessage, type BaseMessage, type BaseMessageChunk } from "@langchain/core/messages";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { getLLM, getResolvedLLMClientOptionsFromInstance } from "../../../llm/factory";
import {
  invokeStructuredLlmDetailed,
  parseStructuredLlmRawContentDetailed,
  formatLivePrompt,
  type StructuredInvokeResult,
} from "../../../llm/structuredInvoke";
import {
  buildStructuredResponseFormat,
  resolveStructuredOutputProfile,
  selectStructuredOutputStrategy,
} from "../../../llm/structuredOutput";
import {
  extractLlmTokenUsage,
  mergeStreamTokenUsage,
  type LlmTokenUsageSnapshot,
} from "../../../llm/usageTracking";
import { logMemoryUsage } from "../../../runtime/memoryTelemetry";
import { toText } from "../../../services/novel/novelP0Utils";
import { beginLlmLiveSession } from "../../../platform/llm/live/llmLiveSession";
import { ReasoningStreamCollector } from "../../../llm/reasoning";
import { hasRegisteredPromptAsset } from "../../registry";
import { CUSTOM_SLOT_CONTEXT_GROUP } from "../../slots/slotResolution";
import { promptSlotOverrideService } from "../../slots/PromptSlotOverrideService";
import { resolveAdvancedPromptMessages } from "../../templates/templateRuntime";
import { selectContextBlocks } from "../contextSelection";
import {
  recordPromptQualityEvent,
  type PromptQualityFailureKind,
} from "../promptQualityTelemetry";
import { appendStructuredOutputHintMessages } from "../structuredOutputHint";
import type {
  PromptAsset,
  PromptExecutionOptions,
  PromptInvocationMeta,
  PromptRenderContext,
  PromptRunResult,
  PromptStreamRunResult,
} from "../promptTypes";
// 提示词执行器的可覆盖 LLM 工厂与结构化调用器(测试注入点,拆分自 promptRunner.ts,RF-1)。
type PromptRunnerLLMFactory = typeof getLLM;
type PromptRunnerStructuredInvoker = typeof invokeStructuredLlmDetailed;

let promptRunnerLLMFactory: PromptRunnerLLMFactory = getLLM;
let promptRunnerStructuredInvoker: PromptRunnerStructuredInvoker = invokeStructuredLlmDetailed;
export function getPromptRunnerLLMFactory(): PromptRunnerLLMFactory {
  return promptRunnerLLMFactory;
}

export function getPromptRunnerStructuredInvoker(): PromptRunnerStructuredInvoker {
  return promptRunnerStructuredInvoker;
}

export function setPromptRunnerLLMFactoryForTests(factory?: PromptRunnerLLMFactory): void {
  promptRunnerLLMFactory = factory ?? getLLM;
}

export function setPromptRunnerStructuredInvokerForTests(invoker?: PromptRunnerStructuredInvoker): void {
  promptRunnerStructuredInvoker = invoker ?? invokeStructuredLlmDetailed;
}
