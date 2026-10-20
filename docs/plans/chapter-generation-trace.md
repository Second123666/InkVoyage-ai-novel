# LOOP-10 计划 · 全链路 Trace 与决策回放(INN-B1)

更新:2026-10-20
状态:进行中
配套:BACKLOG INN-B1

## 1. 现状审计

- 已有分片信号:检索 `RagRetrievalTrace`(采样、无 chapterId)、`promptQualityTelemetry`(内存态)、上下文 gating decisions(装配期计算但只进 package)、`compressionLog`(仅 console.debug)、审核报告/验收/重规划(已落库但分散)。
- **缺口**:没有任何一处把"这一章为什么这么写"的上下文装配、模型参数、审核决策持久化为可回放的结构化轨迹。

## 2. 设计(MVP:持久化 + 只读查询 API;零新 LLM 调用)

1. **模型** `ChapterGenerationTrace`(双 schema + 双迁移,纯新表):novelId/chapterId/chapterOrder/runId + `contextJson`(gating decisions + compressionLog)、`generationJson`(provider/model/temperature/runId)、`auditJson`(总分/各报告 issue codes/开放问题码/是否 blocking)、`decisionJson`(验收状态/repairability/decisionReason/failureCode/replan 建议);索引 (novelId, chapterId, createdAt) 与 (novelId, chapterOrder)。不做关系约束(纯诊断流水,避免级联负担)。
2. **上下文压缩日志入场**:`GenerationContextPackage` 增可选 `contextCompressionLog`(dropped/summarized/usedTokens/budgetTokens),装配器把已有 `buildCompressionLog` 结果同时写入 package(此前仅 console.debug)。
3. **写入点**:`ChapterContentFinalizationService.finalizeChapterContent` 在 runtimePackage 构建后 fire-and-forget `chapterGenerationTraceService.record(...)`(不阻塞定稿;失败吞掉,诊断数据不得影响主链)。
4. **服务** `chapterGenerationTraceService`:`record`(纯函数 `buildChapterGenerationTraceSections` 组装四段 JSON,便于测试)+ `list`(按章节倒序取最近 5 条并解析)。
5. **查询 API**:`GET /api/chapter-traces/:novelId/:chapterId`(只读),返回结构化轨迹列表。
6. **不做**:检索 trace 关联(需给 RagRetrievalTrace 加 chapterId 并铺所有调用点,后置)、前端回放 UI(后置)、修复/重跑轨迹合并视图(多行天然保留历史)。

## 3. 守卫测试(`server/tests/chapterGenerationTrace.test.js`)

1. 四段组装纯函数:上下文 gating/压缩、模型参数、审核码、验收/重规划决策;
2. record 落库(prisma stub 捕获 payload)与 list 解析往返;
3. 定稿钩子静态契约(record 调用 + catch 降级)与路由只读静态契约;
4. package 压缩日志字段(装配器写入 + schema 声明)。

## 4. 验收对照

「任一已生成章节能查到为什么这么写的结构化轨迹」= 定稿即落轨迹 + 只读 API 按章节查询;前端可视化与检索关联后置。

## 5. 验证

server fast 全量(含迁移对齐测试);client 未动沿用既往结论;wiki(rag/context-assembly 增 trace 段)与 PROGRESS/BACKLOG/release notes 同步。
