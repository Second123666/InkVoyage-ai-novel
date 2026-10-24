# RAG 索引模块边界(RAG Index Module)

## 背景

RAG 索引服务负责把章节/世界/知识库文档切块、嵌入并写入向量库,同时维护持久化任务队列。原实现集中在 1242 行的单文件,队列管理、进度快照、嵌入批处理、源加载、分块纯逻辑与持久化编排混在一起;修改分块策略或源加载逻辑都要在核心服务文件中定位。

## 决策

把纯分块逻辑、源加载与嵌入批处理拆到独立模块,服务文件保留队列管理与编排。行为保持不变:并发配置、进度上报节奏、事务边界均不改。

## 当前规则

1. **模块划分**
   - `ragIndexChunking.ts`:纯分块逻辑(`isCjk`、`normalizeRagPreChunks`、`buildRagChunkCandidates`、`buildRagContextualDocumentMap`),无 IO;
   - `ragIndexSourceLoading.ts`:`loadRagSourceDocuments`,prisma 读取,通过参数接收 `normalizeRagPreChunks`;
   - `ragIndexEmbedding.ts`:`embedRagTextsInBatches`,接收 `EmbeddingService` 参数,不依赖 `this`;
   - `RagIndexService.ts`:队列管理、进度快照、`upsertOwnerChunks` / `deleteOwnerChunks` 编排、`syncKnowledgeDocumentIndexStatus`。
2. **依赖方向**:chunking ← sourceLoading;embedding 独立(依赖 EmbeddingService);chunking/sourceLoading/embedding ← service。禁止 chunking 依赖 service。
3. **公共 API**:`RagIndexService` 构造签名、`RagJobCancelledError`、`RagJobProgressSnapshot`、`RagJobSummaryRecord` 不变;新模块只导出被服务引用的函数。
4. **纯函数约束**:chunking 与 embedding 批处理不得读写 prisma;源加载只读 prisma,不写向量库。
5. **队列语义**:`prisma.ragIndexJob` 的入队、取消校验、进度更新仍在服务文件;修改队列语义时同步检查 `novelServiceBoundary.test.js` 的静态守卫。

## 失败模式

- **嵌入批处理进度不一致**:`embedRagTextsInBatches` 的进度阈值(3%)与并发数来自 `ragConfig`,拆分后不得改变调用参数或阈值。
- **源加载结果为空**:检查 `loadRagSourceDocuments` 的 ownerType 分支是否完整;新 ownerType 需在该函数内增加分支。
- **循环依赖**:chunking 不得 import service;service 通过参数注入 chunking 函数。
- **任务队列行为变化**:`novelServiceBoundary.test.js` 的静态守卫要求 `RagIndexService.ts` 包含 `prisma.ragIndexJob`;拆分后该字符串必须保留。

## 相关模块

- `server/src/services/rag/RagIndexService.ts`(队列管理与编排)
- `server/src/services/rag/ragIndexChunking.ts`(纯分块)
- `server/src/services/rag/ragIndexSourceLoading.ts`(源加载)
- `server/src/services/rag/ragIndexEmbedding.ts`(嵌入批处理)
- `server/src/services/rag/index.ts`(模块单例)
- `server/tests/ragChunking.test.js` 等(行为守卫)
- `docs/plans/rf1-rag-index-split.md`
