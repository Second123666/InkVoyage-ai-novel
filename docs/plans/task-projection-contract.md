# LOOP-4 计划 · 统一任务投影契约(INN-B2)

更新:2026-10-17
状态:已完成(§4 全部落地;收敛后的持久契约见 `docs/wiki/architecture/task-projection-contract.md`)
配套:BACKLOG INN-B2 · 审计产物与验证记录见 PROGRESS LOOP-4 条目

## 1. 背景与目标

任务状态在三层之间流转:**①后端真实状态**(执行器写入的业务表)→ **②运行记录 API**(任务中心聚合投影)→ **③前端展示**(任务中心页 / 侧边栏徽标 / 恢复弹窗 / 小说页)。2026-10-17 契约审计(四路扫描 + 合成 + 对抗核实)确认三层存在多处漂移。

**验收(BACKLOG 原文)**:任一长链任务状态在三处可对照;不一致会被守卫测试拦下。

**本轮不做的事**:状态词表大一统(中文/英文阶段键合并)、`markCommandAcceptedOnTask` 清除 pmr 的产品语义决策、DirectorRuntime 四张表归属确认——均挂 BACKLOG 后续轮次(见 §7)。

## 2. 三方对照表(审计合成,精简版)

统一契约:`TaskStatus = queued | running | waiting_approval | succeeded | failed | cancelled`(`shared/types/task.ts`);"待手动恢复"不是第七态,而是 `(status, pendingManualRecovery=true)` 组合。

| 任务种类 | ① 后端真实状态 | ② 运行记录 API | ③ 前端展示 |
|---|---|---|---|
| 章节生产链 `novel_pipeline` | `PipelineJobStatus` 5 态;pause_for_manual → `queued+pmr=true`(`NovelPipelineExecutor.ts:762-780`);质量债只写 payload 不改 status | status 恒等 cast;**pmr 不投影**(`PipelineTaskAdapter.ts:77`);质量债输出 displayStatus/noticeCode | formatStatus + noticeCode 三码硬分级;**pmr 不可见 → 暂停显示"排队中"无 danger** |
| 整本自动导演 `novel_workflow` | 6 态 + pmr + 中文 currentStage;真·待恢复 = `queued+pmr`;读路径 heal 反写状态 | pmr→强制 queued + "等待手动恢复" + displayStatus + recoveryHint(`NovelWorkflowTaskAdapter.ts:276-278`);**list/detail GET 触发 heal 写库**;detail steps 在 pmr 时把当前步标 failed | pmr→danger/需要恢复/must-handle;**摘要 queued vs 步骤 failed 自相矛盾**;小说页另有本地重实现 `novelEditAutomationStatus.ts` |
| 拆书 `book_analysis` | 7 态(含 draft/archived);queued+心跳派生 running;currentStage 含词表外值 | draft/archived→丢弃;步骤表缺 `loading_cache/generating_overview` | 进度可能停在第一步;waiting_approval 筛选恒空(设计性) |
| 知识索引 `knowledge_document` | `RagJobStatus` 5 态;阶段在 payload.progress | status 恒等;progress 从 payload 回退 | 与 pipeline 同 UI;侧边栏另有文档级 `latestIndexStatus` 第二失败源 |
| 图像/写法 `image_generation`/`style_extraction` | 共用 `PipelineJobStatus` | 恒等、pmr 不投影(同 INC-1 类问题,本轮一并覆盖有列的 kind) | 同 pipeline |
| 智能体 `agent_run` | 6 态含 waiting_approval | 唯一非 workflow 可真投影 waiting_approval | "待操作" info + 轮询 |

**sourceRoute 有两套构造器**:list 用 `resumeTargetToRoute`(`novelWorkflow.shared.ts:103-157`),recovery-candidates 用 `buildWorkflowSourceRoute`(`RecoveryTaskService.ts:34-46`)。

**cancelled 三处情绪不一致**:任务中心中性"已取消" / 导演快照折入 failed / 首页归"需要处理" danger。

**failedCount 双口径**:overview raw 计数 vs 前端 must-handle 回退;Sidebar 直接用 raw。

## 3. 发现处置表

| ID | 严重度 | 核实 | 处置 |
|---|---|---|---|
| INC-1 pipeline pmr 不投影 | HIGH | confirmed | **本轮修**(适配器投影 pmr + 前端 tone) |
| INC-15 list/detail 读触发写(heal) | MEDIUM | confirmed | **本轮修**(任务中心读路径默认不 heal) |
| INC-12 pmr 时步骤区标 failed | MEDIUM | confirmed | **本轮修**(步骤区改"等待手动恢复"语义) |
| INC-4 displayStatus 英文 Failed | MEDIUM | confirmed | **本轮修**(改中文用户文案,noticeCode 仍驱动 tone) |
| INC-7 sourceRoute 两套构造 | MEDIUM | confirmed | **本轮修**(收敛到单一构造器) |
| INC-5 cancelled 情绪不一致 | MEDIUM | confirmed | **本轮修**(三处统一:cancelled=中性终态,不再折入 failed/danger) |
| INC-13 failedCount 双口径 | MEDIUM | partly | **本轮修**(overview 增权威计数字段,前端单一来源;清死分支) |
| INC-6 小说页本地重实现 | MEDIUM | partly | **本轮修(轻)**:守卫测试锁定其输出词表 ⊆ 后端契约,防漂移;不重写页面 |
| INC-9 拆书步骤词表缺口 | MEDIUM | partly | 挂 BACKLOG(INN-B2 后续:补 BOOK_ANALYSIS_STEPS 阶段键 + draft/archived 可见性) |
| INC-8 阶段中英分裂 | MEDIUM | partly | 挂 BACKLOG(独立轮:阶段词表统一) |
| INC-3 命令入队清 pmr | MEDIUM | partly | 挂 BACKLOG(需产品语义决策:哪些入队路径可视作显式恢复) |
| INC-17 混合视图隐藏与计数不符 | LOW | 未核 | 挂 BACKLOG(评估 overview 计数与可见性规则对齐) |
| INC-10/11 筛选语义与双失败源 | LOW | 未核 | 挂 BACKLOG(文档化即可,候选小项) |
| INC-16 DirectorRuntime 表无写入方 | LOW | 未核 | 挂 BACKLOG(确认归属,契约文档标注) |
| INC-2 status 过滤 vs 重映射 | — | **refuted** | 无需改动(pmr 写入始终伴随 status=queued) |
| INC-14 前端质量码硬编码 | — | **refuted** | 无需改动(当前三码恰好覆盖全部产出码);守卫测试见 §5 |

## 4. 收敛设计(本轮改动)

### 4.1 pmr 统一投影(INC-1)
- `server/src/services/task/adapters/PipelineTaskAdapter.ts`(及同构的 Image/Style 适配器,实现时读列确认哪些 kind 有 pmr 列):输出 `pendingManualRecovery: boolean`(workflow 已有,补齐其余)。
- `shared/types/task.ts`:`UnifiedTaskSummary.pendingManualRecovery` 从"workflow 专属可选"改为**各 kind 通用可选**(有列即出,无列不出;文档化)。
- `client/src/pages/tasks/taskCenterUtils.ts`:`getTaskQueueTone` 对任意 kind 的 `pmr=true` 输出 danger + "需要恢复";摘要卡/must-handle 口径同步(见 4.6)。

### 4.2 任务中心读路径去副作用(INC-15)
- `NovelWorkflowTaskAdapter.list/detail` 默认不执行 `healAutoDirectorTaskState`;`routes/tasks.ts` GET / 与 /:kind/:id 不再隐式 heal。
- 保留显式通道:follow-ups 的 `revalidate=true` 参数路径继续可用(它有独立语义);启动/后台的既有 heal 调用点不动。
- 守卫:测试断言 GET /api/tasks 处理器不调用 heal(静态/行为级)。

### 4.3 步骤区 pmr 语义(INC-12)
- `novelWorkflowDetailSteps.ts:86-94`:pmr 时当前步不再用 `status="failed"` 构建,改为等待恢复的中性/警告展示(复用任务中心既有 warning tone 词);头部与步骤区语义一致。
- 前端 `TaskCenterDetailSummary`/`TaskCenterDetailPanel` 无需结构改动(按新 status 渲染)。

### 4.4 displayStatus 中文化(INC-4)
- `pipelineJobState.ts:376`:`"Failed with generation alerts"` → 中文用户文案(如"存在待处理的质量提醒";tone 仍由 noticeCode=PIPELINE_QUALITY_REVIEW 驱动 warning,不改分级逻辑)。
- 全库检索同类英文残留,一并处理。

### 4.5 sourceRoute 单一构造器(INC-7)
- `RecoveryTaskService` 的 `buildWorkflowSourceRoute` 收敛为委托 `novelWorkflow.shared.resumeTargetToRoute`(或提取共享构造器供两侧调用);差异分支(simple 体验路由)在共享层显式表达。
- 产物:任务中心详情"打开来源页面"与恢复弹窗对同一任务给出**相同路由**。

### 4.6 cancelled 与计数统一(INC-5 / INC-13)
- cancelled:**中性终态**统一 —— `DirectorDisplayStateBuilder.ts:86-90` 不再把 cancelled 折入 failed;`homeViewModel.ts:202-210` cancelled 与 failed 分离(单独"已取消"呈现,不进 danger/需要处理);任务中心保持"已取消"中性。
- failedCount:`TaskCenterService` overview 增加权威字段(如 `attentionCount` = 需用户处理的失败,排除纯质量提醒失败 + 含 pmr/recovery/replan,实现时按现有 must-handle 语义对齐);`TaskCenterPage`/`Sidebar` 统一消费,删除回退双口径与死分支。

### 4.7 小说页本地映射守卫(INC-6)
- 不重写 `novelEditAutomationStatus.ts`;新增守卫测试:其输出词表必须 ⊆ `TaskStatus` 且 `waiting_recovery/blocked` 分支的输出与任务中心契约(pmr→queued+pmr、blocked→failed 的降级)一致,防止后端改契约时前端静默漂移。

## 5. 守卫测试(防再漂移)

新增 `server/tests/taskProjectionContract.test.js`(或并入既有合同测试组),断言:

1. 每个 adapter 的 summary 输出含统一契约字段(kind 差异白名单显式列出);有 pmr 列的 kind 必出 `pendingManualRecovery`;
2. `pipelineJobState` displayStatus 无英文残留(`doesNotMatch /[A-Za-z]{4,} alerts/ 类模式或白名单制);
3. `RecoveryTaskService` 与 `NovelWorkflowTaskAdapter` 使用同一 sourceRoute 构造函数(静态引用断言);
4. tasks 路由 GET 处理器不调用 heal(静态:源码不含 heal 调用 / mock 断言不触发);
5. detail steps 在 pmr 时当前步 status ≠ failed;
6. client 侧:`getTaskQueueTone` 对任意 kind pmr=true 输出 danger;`novelEditAutomationStatus` 输出词表 ⊆ TaskStatus。

## 6. 验证

- `pnpm --filter @ai-novel/server test`(fast 全量,基线 1383/0 失败)
- `pnpm --filter @ai-novel/client typecheck` + `pnpm --filter @ai-novel/client test`(基线 215/215)
- 受影响链路手工核对(如 dev 起服务看 /api/tasks 返回形状)——UI 验收按仓库规则留给所有者
- 完成后:wiki 新增 `docs/wiki/architecture/task-projection-contract.md`(三层契约 + 本轮收敛规则,AGENTS wiki 优先级 #3)

## 7. 风险与回退

- **heal 移除**是行为变更:陈旧状态不再被读路径自愈 → 依赖 heal 的展示可能短暂陈旧。回退点:仅改默认参数,显式 revalidate 通道保留;若发现回归,恢复 list heal 为可选参数默认开并记录契约例外。
- **overview 新增字段**是加法契约,旧前端字段不动,兼容桌面版;失败可单独回滚该 commit。
- **cancelled 语义**触碰导演快照与首页两处既有测试,若测试断言旧折叠行为,按"契约修正"更新测试并注明依据(审计 INC-5 confirmed)。
- 每项改动独立成 commit,可按提交粒度回滚。
