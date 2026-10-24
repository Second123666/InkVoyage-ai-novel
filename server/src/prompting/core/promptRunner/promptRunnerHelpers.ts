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
// 提示词执行纯工具:渲染上下文、调用元信息、错误分类、重试消息(拆分自 promptRunner.ts,RF-1)。
export function buildRenderContext(
  asset: PromptAsset<unknown, unknown, unknown>,
  rawBlocks: Parameters<typeof selectContextBlocks>[0],
  resolvedSlots?: import("../../slots/slotTypes").ResolvedSlots,
): PromptRenderContext {
  const selection = selectContextBlocks(rawBlocks, asset.contextPolicy);
  return {
    blocks: selection.selectedBlocks,
    selectedBlockIds: selection.selectedBlocks.map((block) => block.id),
    droppedBlockIds: selection.droppedBlockIds,
    summarizedBlockIds: selection.summarizedBlockIds,
    estimatedInputTokens: selection.estimatedTokens,
    slots: resolvedSlots,
  };
}

export function assertRegistered(asset: PromptAsset<unknown, unknown, unknown>): void {
  if (!hasRegisteredPromptAsset(asset.id, asset.version)) {
    throw new Error(`Prompt asset is not registered: ${asset.id}@${asset.version}`);
  }
}

export function buildPromptInvocationMeta(
  asset: PromptAsset<unknown, unknown, unknown>,
  context: PromptRenderContext,
  repairUsed: boolean,
  repairAttempts: number,
  semanticRetryUsed: boolean,
  semanticRetryAttempts: number,
  options?: PromptExecutionOptions,
): PromptInvocationMeta {
  return {
    promptId: asset.id,
    promptVersion: asset.version,
    taskType: asset.taskType,
    novelId: options?.novelId,
    chapterId: options?.chapterId,
    volumeId: options?.volumeId,
    taskId: options?.taskId,
    stage: options?.stage,
    itemKey: options?.itemKey,
    scope: options?.scope,
    entrypoint: options?.entrypoint,
    sceneIndex: options?.sceneIndex,
    roundIndex: options?.roundIndex,
    triggerReason: options?.triggerReason,
    contextBlockIds: context.selectedBlockIds,
    droppedContextBlockIds: context.droppedBlockIds,
    summarizedContextBlockIds: context.summarizedBlockIds,
    customAddendumBlockIds: context.selectedBlockIds.filter((id) => id.startsWith(`${CUSTOM_SLOT_CONTEXT_GROUP}:`)),
    estimatedInputTokens: context.estimatedInputTokens,
    repairUsed,
    repairAttempts,
    semanticRetryUsed,
    semanticRetryAttempts,
  };
}

export async function resolvePromptOverlaysForAsset(input: {
  asset: PromptAsset<unknown, unknown, unknown>;
  contextBlocks?: Parameters<typeof selectContextBlocks>[0];
  options?: PromptExecutionOptions;
}): Promise<{
  blocks: Parameters<typeof selectContextBlocks>[0];
  resolvedSlots?: import("../../slots/slotTypes").ResolvedSlots;
}> {
  const baseBlocks = input.contextBlocks ?? [];
  const slotDefs = input.asset.slots;
  if (!slotDefs || slotDefs.length === 0) {
    return { blocks: baseBlocks };
  }

  const overlays = await promptSlotOverrideService.resolveForRuntime({
    promptId: input.asset.id,
    novelId: input.options?.novelId,
  });

  const allBlocks = overlays.appendBlocks.length > 0
    ? [...baseBlocks, ...overlays.appendBlocks]
    : baseBlocks;

  return { blocks: allBlocks, resolvedSlots: overlays.inlineSlots };
}

export function resolveStructuredRepairAttempts(asset: PromptAsset<unknown, unknown, unknown>): number {
  return Math.max(0, asset.repairPolicy?.maxAttempts ?? 1);
}

export function resolveStructuredSemanticRetryAttempts(asset: PromptAsset<unknown, unknown, unknown>): number {
  return Math.max(0, asset.semanticRetryPolicy?.maxAttempts ?? 0);
}

export function stringifyPromptError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }
  return String(error);
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export function buildPromptCallOptions(options?: PromptExecutionOptions): Record<string, unknown> {
  const callOptions: Record<string, unknown> = {};
  if (options?.signal) {
    callOptions.signal = options.signal;
  }
  return callOptions;
}

export function estimateRenderedPromptChars(messages: BaseMessage[]): number {
  return messages.reduce((sum, message) => sum + toText(message.content).length, 0);
}

export function estimateOutputChars(output: unknown): number {
  if (typeof output === "string") {
    return output.length;
  }
  return safeJsonStringify(output).length;
}

export function isPromptOutputEmpty(output: unknown): boolean {
  return typeof output === "string" && output.trim().length === 0;
}

export function markPromptQualityFailure(error: unknown, failureKind: PromptQualityFailureKind): unknown {
  if (error && typeof error === "object") {
    try {
      Object.defineProperty(error, "promptQualityFailureKind", {
        value: failureKind,
        configurable: true,
      });
    } catch {
      // Ignore non-extensible errors.
    }
  }
  return error;
}

export function classifyPromptQualityFailure(error: unknown): PromptQualityFailureKind {
  const marked = error as { promptQualityFailureKind?: unknown };
  if (
    marked
    && typeof marked === "object"
    && (
      marked.promptQualityFailureKind === "llm_error"
      || marked.promptQualityFailureKind === "schema_repair_failed"
      || marked.promptQualityFailureKind === "post_validate_failed"
      || marked.promptQualityFailureKind === "empty_output"
      || marked.promptQualityFailureKind === "unknown"
    )
  ) {
    return marked.promptQualityFailureKind;
  }
  const message = stringifyPromptError(error).toLowerCase();
  if (message.includes("schema") || message.includes("json") || message.includes("zod") || message.includes("structured")) {
    return "schema_repair_failed";
  }
  if (message.includes("postvalidate") || message.includes("semantic")) {
    return "post_validate_failed";
  }
  return "llm_error";
}

export function buildDefaultSemanticRetryMessages<I, R>(input: {
  baseMessages: BaseMessage[];
  attempt: number;
  parsedOutput: R;
  validationError: string;
}): BaseMessage[] {
  return [
    ...input.baseMessages,
    new HumanMessage([
      `上一次输出虽然通过了 JSON 结构校验，但没有通过业务校验。这是第 ${input.attempt} 次语义重试。`,
      `失败原因：${input.validationError}`,
      "",
      "上一次的 JSON 输出：",
      safeJsonStringify(input.parsedOutput),
      "",
      "请基于同一任务重新生成完整 JSON 对象。",
      "硬要求：",
      "1. 只输出最终 JSON 对象。",
      "2. 不要输出 Markdown、解释、注释或额外文本。",
      "3. 必须修正上面的业务校验失败点。",
    ].join("\n")),
  ];
}

export function buildSemanticRetryMessages<I, O, R>(input: {
  asset: PromptAsset<I, O, R>;
  promptInput: I;
  context: PromptRenderContext;
  baseMessages: BaseMessage[];
  parsedOutput: R;
  validationError: string;
  attempt: number;
}): BaseMessage[] {
  return input.asset.semanticRetryPolicy?.buildMessages?.({
    promptId: input.asset.id,
    promptVersion: input.asset.version,
    attempt: input.attempt,
    promptInput: input.promptInput,
    context: input.context,
    baseMessages: input.baseMessages,
    parsedOutput: input.parsedOutput,
    validationError: input.validationError,
  }) ?? buildDefaultSemanticRetryMessages(input);
}

