# 任务投影三层契约(后端真实状态 / 运行记录 API / 前端展示)

## Background

任务状态在三层之间流转:①**后端真实状态**(执行器写入的业务表 status/payload)→ ②**运行记录 API**(任务中心 7 个适配器聚合投影)→ ③**前端展示**(任务中心页、侧边栏徽标、恢复弹窗、导演快照卡)。三层各自演化时会出现"同一任务三处读数不同"的漂移(2026-10-17 契约审计确认 17 处,见 PROGRESS LOOP-4)。本页记录收敛后的契约规则。

## Decision

统一契约类型:`TaskStatus = queued | running | waiting_approval | succeeded | failed | cancelled`(`shared/types/task.ts`);`TaskKind` 七种。**「待手动恢复」不是第七态**,而是 `(status, pendingManualRecovery=true)` 组合;**已取消(cancelled)是中性终态**,任何一层都不得把它折入失败/需要处理。

## Current Rule

1. **pmr 有列即出**:存储表有 `pendingManualRecovery` 列的 kind(book_analysis / novel_pipeline / image_generation / novel_workflow / style_extraction)必须在适配器 summary 原样投影该布尔值;无列的 kind(knowledge_document / agent_run)不得携带。前端 `getTaskQueueTone` 对任意 kind 的 `pmr=true` 输出 danger「需要恢复」。守卫:`server/tests/taskProjectionContract.test.js`。
2. **任务中心读路径不得写库**:GET /api/tasks 列表/详情不触发 `healAutoDirectorTaskState`;heal 是显式 opt-in(`options.heal === true`),保留通道:follow-ups 的 revalidate 语义、写操作(retry/cancel)后的状态归一化、启动/后台对账。守卫:同上测试的 GET 处理器静态断言。
3. **attentionCount 是「需要处理」的唯一权威计数**:`TaskCenterService.overview.attentionCount` = 失败(排除纯质量提醒失败码 PIPELINE_QUALITY_REVIEW / CHAPTER_TITLE_DIVERSITY)+ pmr + 需要重规划,与前端 `isTaskMustHandle` 逐码同口径;前端(任务中心摘要、侧边栏徽标)只消费该字段,不做本地二次推导。守卫:同上测试 + client `taskCenterUtils.test.mjs`。
4. **sourceRoute 单一构造器**:导演任务的来源路由一律由 `novelWorkflow.shared.buildNovelWorkflowSourceRoute` 产出(任务中心 list 与恢复候选同一函数同一输入);无恢复目标时回落 `/tasks?kind=novel_workflow&id=…` 深链,simple 体验统一落 `/novels/:id/simple`。禁止在消费侧重写路由构造。
5. **cancelled 中性呈现**:任务中心「已取消」中性 tone;导演显示层 `DirectorDisplayMode`/`DirectorDashboardMode` 含独立 `cancelled`(headline「已取消」,不提供恢复动作);首页把 cancelled 与 failed 分离;前端接管容器(`AITakeoverMode`/`NovelEditTakeoverState.mode`)同样有 `cancelled` 中性分支。守卫:`directorDisplayStateBuilder.test.js`、`directorDashboardViewBuilder.test.js`。
6. **用户可见文案必须中文**:`displayStatus`/headline/状态标签不得漏出英文实现注释(曾出现 "Failed with generation alerts")。守卫:契约测试含英文残留断言。
7. **质量债 ≠ 失败**:质量提醒只写 payload(noticeCode/failureCode),不改 status;语气分级由 noticeCode/failureCode 驱动,不由 status 单独驱动。

## Failure Modes

- 在适配器里"顺手"重映射 status 而不更新 overview 计数 → 摘要卡与列表行对不上(历史 INC-2 类问题的正确面:计数与列表必须同源)。
- 在前端本地复刻后端映射规则(如小说页 `novelEditAutomationStatus` 的降级映射)→ 后端改契约时静默漂移;此类本地映射必须有守卫测试锁定输出词表 ⊆ TaskStatus。
- 把 heal 重新接回读路径"顺手修复陈旧状态" → 打破任务中心只读契约;陈旧状态应走启动/后台对账,不走用户读操作。
- 为 cancelled 复用 failed 分支"省一个 case" → 用户把取消读成失败,三层情绪再次分裂。

## Related Modules

- `server/src/services/task/` — TaskCenterService、adapters(7 kind)、taskCenter.shared、RecoveryTaskService、novelWorkflowDetailSteps
- `server/src/services/novel/pipelineJobState.ts` — 章节流水线 notice/displayStatus 装饰
- `server/src/services/novel/director/projections/` — DirectorDisplayStateBuilder、DirectorDashboardViewBuilder、DirectorBookAutomationProjectionService
- `client/src/pages/tasks/` — 任务中心页与 taskCenterUtils(语气/计数消费)
- `client/src/components/layout/Sidebar.tsx` — attentionCount 徽标
- `shared/types/task.ts`、`shared/types/directorRuntime.ts` — 契约词表

## Source Documents

- 审计与收敛计划:`docs/plans/task-projection-contract.md`(LOOP-4,2026-10-17)
- 审计发现全清单与核实结论:`docs/workflow/PROGRESS.md` LOOP-4 条目
- 产品规则约束:`AGENTS.md`(Auto-Director Quality Gate Rules、Task Center Role Rules)
