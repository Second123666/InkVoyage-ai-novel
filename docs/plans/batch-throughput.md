# LOOP-19 计划 · 批量生成吞吐优化(INN-D3)

更新:2026-10-23
状态:进行中
配套:BACKLOG INN-D3

## 1. 现状审计

- **章节生产链**:章节正文/摘要/事实/状态有严格前序依赖,自动导演按章串行,不可并行;
- **节奏段章节列表**:每段携带前一段已生成章节摘要,按 beat 串行;
- **拆书角色**:`BookAnalysisCharacterService` 已有 worker pool(并发 3)与预算守卫;
- **导演候选**:书名补强已 `Promise.all` 并行;
- **角色外显资料批量生成**:`CharacterVisibleProfileService.generateBatchVisibleProfiles` 逐角色 `await`,每个角色独立读取上下文并调用一次结构化模型 —— 唯一安全且明显的串行缺口。

## 2. 设计

1. **有界并发批次** `characterVisibleProfileBatch.ts`:
   - 默认并发 `VISIBLE_PROFILE_BATCH_CONCURRENCY = 3`;
   - worker pool 抢任务,避免一次性创建 N 个 Promise;
   - slot 回填保证结果/跳过项按输入角色顺序返回;
   - 单项失败转跳过项,不中断整批;已有资料的角色保持原跳过语义。
2. **服务接线**:`generateBatchVisibleProfiles` 改为调用批次函数,移除串行循环。
3. **边界**:不并行章节生产链/节奏段章节列表;不绕过 provider requestLimiter(用户配置的并发/间隔仍然生效)。
4. **不做**:批次层预加载共享小说上下文(残留优化)、动态并发配置 UI、跨批次调度。

## 3. 守卫测试

`server/tests/characterVisibleProfileBatch.test.js`:
- 并发上限观测(maxActive = 3)与完成顺序打乱时结果顺序稳定;
- 跳过 + 单项失败隔离,跳过项顺序稳定;
- 自定义并发、空列表;
- 静态接线:服务复用批次函数且不得回退串行循环。

## 4. 验收对照

「批量生成吞吐优化」= 独立批量任务从串行改为有界并发,等待时间约降至 1/3(受 provider 限速影响),顺序与失败语义不变;章节链保持串行以保证连续性。

## 5. 验证

server 全量 + client typecheck/测试;wiki `workflows/batch-generation-throughput.md`;发布说明按用户可见性能优化记录。PROGRESS/BACKLOG([x]+✅)。
