# 章节资产增量模块边界(Chapter Artifact Delta)

## 背景

章节资产增量链路负责把正文抽取结果分发到摘要/事实、状态快照、角色资源、伏笔账本、角色动态、知识与对话影响等消费者,并用正文版本栅栏防止过期结果落库。原实现集中在 1302 行的单文件,纯文本工具、版本守卫、编排与伏笔消费者混在一起,修改伏笔写入或文本工具都需要在核心编排文件中定位。

## 决策

把纯工具/类型/守卫与伏笔消费者拆到 `artifactSync/` 子模块,服务文件保留编排与其余消费者。行为保持不变,`CHAPTER_ARTIFACT_CONSUMERS` 顺序、事务边界、错误信息与公共 API 均不改。

## 当前规则

1. **模块划分**
   - `artifactSync/chapterArtifactDelta.shared.ts`:共享类型、角色解析、知识边界、账本键、上下文文本构建、角色名册、章节引用解析、`assertExpectedChapterContentInTransaction`;
   - `artifactSync/chapterArtifactPayoffConsumer.ts`:`applyPayoffDeltas`,负责伏笔账本增量 upsert;
   - `ChapterArtifactDeltaService.ts`:公共类型/消费者枚举、提取与按消费者应用编排、摘要/快照/角色资源/动态/知识/心智/对话影响、RAG 队列。
2. **版本栅栏**:所有落库路径必须继续校验 `expectedChapterContent`;事务内守卫统一复用 shared 中的 `assertExpectedChapterContentInTransaction`,不得在消费者内重新实现。
3. **公共 API**:`mergeKnowledgeBoundaryState` 由服务文件 re-export;外部继续从服务路径导入,不得深引用 `artifactSync/` 内部文件。
4. **伏笔锁语义**:增量写入继续走 `sanitizePayoffLedgerSyncItem` 与 `manualLocked` 保护;拆分不得调整 upsert 字段或锁定分支。
5. **测试守护**:`chapterArtifactDialogue`、`chapterArtifactInfluence`、`chapterRuntime*`、`payoffLedger*` 必须保持通过。

## 失败模式

- **过期正文写入**:检查消费者是否绕过事务内版本守卫;守卫必须在写入前执行,错误信息保持原文。
- **伏笔手动锁定被覆盖**:确认 payoff 消费者仍读取 `manualLocked` 并保留原状态/窗口/原因。
- **消费者顺序变化**:`CHAPTER_ARTIFACT_CONSUMERS` 的顺序决定同步字段聚合顺序,不得重排。
- **外部深引用**:业务代码直接 import `artifactSync/chapterArtifactDelta.shared` 时,改回服务门面导入。

## 相关模块

- `server/src/services/novel/runtime/ChapterArtifactDeltaService.ts`(编排与公共 API)
- `server/src/services/novel/runtime/artifactSync/chapterArtifactDelta.shared.ts`(共享工具与守卫)
- `server/src/services/novel/runtime/artifactSync/chapterArtifactPayoffConsumer.ts`(伏笔消费者)
- `server/src/services/payoff/payoffLedgerShared.ts`(账本规范化)
- `docs/plans/rf1-artifact-delta-split.md`
