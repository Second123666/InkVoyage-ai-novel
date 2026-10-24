# LOOP-26 计划 · RF-1 第七个文件:`RagIndexService.ts`

更新:2026-10-24
状态:进行中
配套:BACKLOG RF-1

## 1. 现状审计

`server/src/services/rag/RagIndexService.ts` 1242 行,是 RAG 索引的核心服务。文件混杂:

1. 队列管理:任务入队、取下一个可运行任务、状态更新、列表与摘要;
2. 进度快照:解析任务载荷、写进度、校验未取消;
3. 嵌入批处理:按配置分批/并发调用嵌入服务并回报进度;
4. 源文档加载:按 ownerType 读取章节/世界/知识库等来源;
5. 分块纯逻辑:预分块归一化、候选构建、上下文文档映射;
6. 索引持久化:删除/写入 owner 的向量与 chunk 记录。

`upsertOwnerChunks`(约 258 行)是编排核心,串联加载→分块→上下文→嵌入→持久化。

## 2. 拆分方案(行为不变)

- `ragIndexChunking.ts`:`isCjk`、`normalizeRagPreChunks`、`buildRagChunkCandidates`、`buildRagContextualDocumentMap`(纯函数,无 IO);
- `ragIndexSourceLoading.ts`:`buildJoinedText`、`loadRagSourceDocuments`(prisma 读取,仅依赖 `normalizeRagPreChunks` 注入);
- `ragIndexEmbedding.ts`:`embedRagTextsInBatches`(接收 `EmbeddingService` 参数,不再依赖 `this`);
- `RagIndexService` 保留:队列管理、进度快照、`upsertOwnerChunks` / `deleteOwnerChunks` 编排、`syncKnowledgeDocumentIndexStatus`。

## 3. 拆分原则

- 只移动代码、补充导入导出;不改任何阈值、并发配置、进度上报节奏与事务边界;
- 嵌入批处理改为纯函数并显式接收 `EmbeddingService`,不改变调用语义;
- 源加载函数通过参数接收 `normalizeRagPreChunks`,避免循环依赖;
- 公共 API(`RagIndexService` 构造签名、`RagJobCancelledError`、`RagJobProgressSnapshot`、`RagJobSummaryRecord`)不变;
- 队列与编排留在服务文件,保持单文件职责清晰。

## 4. 验证

- server build;
- 定向 `ragChunking` / `ragContextualChunk` / `ragJobListing` / `knowledgeServiceStatus` / `ragCompatibilityBootstrap`;
- server 全量套件。

## 5. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 服务文件从 1242 降至约 768 行,纯分块/源加载/嵌入批处理各有明确归属,全部既有测试通过。

## 6. 后续

RF-1 剩余 1 个文件:`promptRunner.ts`(1264)。
