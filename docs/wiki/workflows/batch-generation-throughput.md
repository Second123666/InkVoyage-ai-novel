# 批量生成吞吐(Batch Generation Throughput)

## 背景

小说生产链里存在多类"批量"生成,它们的并行安全性不同:

- **章节生产链**:第 N 章依赖第 N-1 章的摘要、事实账本与状态,必须串行;并行会破坏连续性与事实一致性。
- **节奏段章节列表**:每个节奏段会带上"前一段已生成章节的摘要"作为上下文,因此也按顺序推进。
- **书评/拆书角色**:已有 worker pool(`BookAnalysisCharacterService`、`runWithConcurrency`)。
- **导演候选方案**:同一批候选的书名补强已用 `Promise.all` 并行。
- **角色外显资料批量生成**:每个角色独立读取本书上下文并调用一次结构化模型,原实现逐个 `await`,是最明显且安全的吞吐缺口。

## 决策

只对**彼此独立、无跨项依赖**的批量任务做有界并发;章节生产链保持串行。

角色外显资料批量生成改为默认最多 3 个并发(`VISIBLE_PROFILE_BATCH_CONCURRENCY`),抽成纯函数 `runCharacterVisibleProfileBatch`,具备:

1. 并发上限:worker pool 模式,最多同时 3 个;
2. 顺序稳定:结果与跳过项按输入角色顺序返回,不随完成顺序变化;
3. 失败隔离:单个角色失败只进入 `skippedCharacters`,其他角色继续;
4. 跳过语义保持:外显资料已完整的角色仍以"外显资料已较完整"跳过。

## 当前规则

1. 新增批量 LLM 任务时,先判断是否存在跨项依赖;有依赖的链路(章节正文、章节摘要、节奏段章节列表)不得并行化。
2. 独立批量任务使用有界并发,默认上限 3;需要更高并发时应先确认 provider 的 `concurrencyLimit` / `requestIntervalMs` 配置,不得绕过 `requestLimiter`。
3. 批量结果必须按输入顺序返回;前端列表和后续 `apply` 依赖稳定顺序。
4. 单项失败不得中断整批;失败原因写入跳过项,由调用方展示。
5. 并发上限常量放在拥有该批量的模块内(如 `characterProfile/characterVisibleProfileBatch.ts`),不要新增通用 `utils` 模块。

## 失败模式

- **批量变慢或没有提升**:检查 provider 是否配置了 `concurrencyLimit=1` 或 `requestIntervalMs`,共享限速器会把并发请求重新排队,这是预期行为。
- **角色顺序错乱**:确认结果是否经过 `runCharacterVisibleProfileBatch` 的 slot 回填,不要在并发生成回调里直接 `push`。
- **单个角色失败导致整批失败**:检查是否在 worker 外抛错;批量层必须捕获单项异常并转为跳过项。
- **模型限流/429 增多**:默认上限 3 已较保守;若仍触发,优先调低 provider 并发或提高请求间隔,不要盲目提高批量上限。
- **数据库压力上升**:每个角色都会读取一次小说与世界上下文;并发 3 是折中,后续如需进一步优化应在批次层预加载共享上下文,而不是无限提高并发。

## 相关模块

- `server/src/services/novel/characterProfile/characterVisibleProfileBatch.ts`(有界并发批次)
- `server/src/services/novel/characterProfile/CharacterVisibleProfileService.ts`(批量生成入口)
- `server/src/llm/requestLimiter.ts`(provider 级并发/间隔限速)
- `server/src/services/bookAnalysis/infrastructure/bookAnalysis.concurrent.ts`(既有 worker pool 先例)
- `server/src/services/novel/director/phases/novelDirectorCandidateStage.ts`(候选并行先例)
- `docs/plans/batch-throughput.md`(本轮计划)

## 来源文档

- [章节生产链](./chapter-production-chain.md)
- [模型选择与成本](../architecture/model-selection.md)
