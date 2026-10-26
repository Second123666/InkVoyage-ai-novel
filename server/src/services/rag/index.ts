import { EmbeddingService } from "./EmbeddingService";
import { VectorStoreService } from "./VectorStoreService";
import { HybridRetrievalService } from "./HybridRetrievalService";
import { RagIndexService } from "./RagIndexService";
import { RagContextualChunkService } from "./RagContextualChunkService";
import { RagRerankerService } from "./RagRerankerService";
import { RagJobCleanupService } from "./RagJobCleanupService";
import { RagRetrievalTraceRetention } from "./RagRetrievalTraceRetention";
import { RagWorker } from "./RagWorker";

// RF-5:改为惰性单例 —— 模块加载不再立即实例化整条 RAG 依赖链,
// 避免冷启动期间因构造顺序/环境未就绪触发 "is not a constructor" 类故障。
let embeddingServiceInstance: EmbeddingService | null = null;
let vectorStoreServiceInstance: VectorStoreService | null = null;
let ragContextualChunkServiceInstance: RagContextualChunkService | null = null;
let ragRerankerServiceInstance: RagRerankerService | null = null;
let ragIndexServiceInstance: RagIndexService | null = null;
let ragJobCleanupServiceInstance: RagJobCleanupService | null = null;
let ragRetrievalTraceRetentionInstance: RagRetrievalTraceRetention | null = null;
let hybridRetrievalServiceInstance: HybridRetrievalService | null = null;
let ragWorkerInstance: RagWorker | null = null;

function getEmbeddingService(): EmbeddingService {
  return (embeddingServiceInstance ??= new EmbeddingService());
}

function getVectorStoreService(): VectorStoreService {
  return (vectorStoreServiceInstance ??= new VectorStoreService());
}

function getRagContextualChunkService(): RagContextualChunkService {
  return (ragContextualChunkServiceInstance ??= new RagContextualChunkService());
}

function getRagRerankerService(): RagRerankerService {
  return (ragRerankerServiceInstance ??= new RagRerankerService());
}

function getRagIndexService(): RagIndexService {
  return (ragIndexServiceInstance ??= new RagIndexService(
    getEmbeddingService(),
    getVectorStoreService(),
    getRagContextualChunkService(),
  ));
}

function getRagJobCleanupService(): RagJobCleanupService {
  return (ragJobCleanupServiceInstance ??= new RagJobCleanupService());
}

function getRagRetrievalTraceRetention(): RagRetrievalTraceRetention {
  return (ragRetrievalTraceRetentionInstance ??= new RagRetrievalTraceRetention());
}

function getHybridRetrievalService(): HybridRetrievalService {
  return (hybridRetrievalServiceInstance ??= new HybridRetrievalService(
    getEmbeddingService(),
    getVectorStoreService(),
    getRagRerankerService(),
  ));
}

function getRagWorker(): RagWorker {
  return (ragWorkerInstance ??= new RagWorker(getRagIndexService()));
}

export const ragServices = {
  get embeddingService() { return getEmbeddingService(); },
  get vectorStoreService() { return getVectorStoreService(); },
  get ragContextualChunkService() { return getRagContextualChunkService(); },
  get ragRerankerService() { return getRagRerankerService(); },
  get ragIndexService() { return getRagIndexService(); },
  get ragJobCleanupService() { return getRagJobCleanupService(); },
  get ragRetrievalTraceRetention() { return getRagRetrievalTraceRetention(); },
  get hybridRetrievalService() { return getHybridRetrievalService(); },
  get ragWorker() { return getRagWorker(); },
};
