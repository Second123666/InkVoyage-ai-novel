import type { RagIndexJob } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ragConfig } from "../../config/rag";
import { getRagEmbeddingSettings } from "../settings/RagSettingsService";
import { EmbeddingService } from "./EmbeddingService";
import { VectorStoreService } from "./VectorStoreService";
import { RagContextualChunkService, type RagContextualChunkDocument } from "./RagContextualChunkService";
import { resolveEmbeddingChunkTokenBudget } from "./embeddingModelLimits";
import type { RagChunkCandidate, RagJobStatus, RagJobType, RagOwnerType, RagSourceDocument } from "./types";
import { buildChunkId, computeChunkHash, estimateTokenCount, normalizeRagText, splitRagChunks } from "./utils";
import { runWithConcurrency } from "./utils";
import {
  encodeFacetKeys,
  extractChapterAnchorFromChunk,
  extractCharacterRolesFromChunk,
  normalizeRagFacets,
  type RagChunkAnchor,
  type RagChunkFacets,
  type RagPreChunk,
} from "./chunkFacets";
// RAG 嵌入批处理:按配置分批/并发调用嵌入服务并回报进度(拆分自 RagIndexService.ts,RF-1)。
export async function embedRagTextsInBatches(
  embeddingService: EmbeddingService,
  texts: string[],
  onProgress?: (payload: { processed: number; total: number }) => Promise<void>,
): Promise<{ vectors: number[][]; provider: string; model: string }> {
    if (texts.length === 0) {
      return { vectors: [], provider: ragConfig.embeddingProvider, model: ragConfig.embeddingModel };
    }
    const batchSize = ragConfig.embeddingBatchSize;
    const concurrency = ragConfig.embeddingConcurrency;
    const vectors: number[][] = new Array(texts.length);
    let provider = ragConfig.embeddingProvider;
    let model = ragConfig.embeddingModel;
    let processed = 0;
    let lastReportPercent = 0;

    const batches: { start: number; texts: string[] }[] = [];
    for (let cursor = 0; cursor < texts.length; cursor += batchSize) {
      batches.push({ start: cursor, texts: texts.slice(cursor, cursor + batchSize) });
    }

    await runWithConcurrency(batches, concurrency, async (batch) => {
      const result = await embeddingService.embedTexts(batch.texts);
      provider = result.provider;
      model = result.model;
      for (let i = 0; i < result.vectors.length; i += 1) {
        vectors[batch.start + i] = result.vectors[i];
      }
      processed += batch.texts.length;

      if (onProgress) {
        const percent = texts.length > 0 ? processed / texts.length : 1;
        if (percent - lastReportPercent >= 0.03 || processed >= texts.length) {
          lastReportPercent = percent;
          await onProgress({ processed: Math.min(processed, texts.length), total: texts.length });
        }
      }
    });

    return { vectors, provider, model };
  }
