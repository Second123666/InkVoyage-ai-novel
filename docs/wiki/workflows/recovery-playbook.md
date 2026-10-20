# 失败模式 → 恢复动作知识库(Recovery Playbook)

## 背景

任务的暂停与失败原因以结构化码散落在各层:适配器 `failureCode`(PIPELINE_* / NOVEL_WORKFLOW_FAILED / 各任务 *_FAILED、*_CANCELLED)、提醒码 `noticeCode`(PIPELINE_QUALITY_REVIEW / PIPELINE_REPLAN_REQUIRED / CHAPTER_TITLE_DIVERSITY)、章节失败分类(failureClassification:none / draft_generation_failed / draft_obligation_unmet / draft_repair_exhausted / replan_required),以及"待手动恢复"(status+pendingManualRecovery)组合。此前这些码只用于展示文案或局部判断,没有统一的"原因 → 恢复动作"知识。

## 决策

建立**确定性**的恢复知识库:只把已结构化的失败/提醒码映射为「原因解释 + 用户视角恢复动作 + 模式(auto_retry/user_action/replan/inspect)+ 是否可重试」。不做自由文本关键词判断,不执行恢复动作(可执行入口仍在源页面/导演跟进),不新增 LLM 调用。

## 当前规则

1. **注册表**位于 `server/src/services/task/recoveryPlaybook.ts`,条目类型在 `shared/types/recoveryPlaybook.ts`;新增失败码时必须同步登记条目,未登记码会得到 `unknown_failure` 兜底而不是透传原文。
2. **解析优先级**:`pendingManualRecovery=true`(最高,人工恢复语义不得被具体失败码覆盖)> `failureCode` > `noticeCode` > `failureClassificationCode` > 兜底;无任何结构化信号时不注入指引(null)。
3. **接线**:`TaskCenterService.getTaskDetail` 是唯一装饰点,为详情附加可选字段 `recoveryGuidance`(加法字段,适配器零改动;旧前端不受影响)。
4. **只读目录**:`GET /api/recovery-playbook` 返回全部条目,供前端/Agent 后续消费。
5. **语义约束**:质量提醒类(`PIPELINE_QUALITY_REVIEW`、`draft_obligation_unmet`)标 `inspect` 且 `retryable=false`——质量债≠失败;重规划类标 `replan`;租约丢失标 `auto_retry`;人工恢复条目 `retryable=false`,因为它需要显式用户动作。

## 示例

- 章节流水线失败(PIPELINE_FAILED):详情返回「打开章节页查看失败章节 → 修复后从失败章节重试」。
- 人工暂停中的任务同时带失败码:解析结果仍为 `manual_recovery_required`,提示"确认后从最近进度继续"。
- 未登记的新失败码:返回 `unknown_failure` 兜底("查看运行记录中的错误详情")。

## 失败模式

- 任务详情没有 `recoveryGuidance`:确认该任务是否真有 failureCode/noticeCode/pmr;三者皆空的运行中任务返回 null 属预期。
- 指引与实际能力不符:先检查注册表条目是否与当前恢复入口一致(例如重规划已迁移到新入口时需同步更新 `recommendedActions` 文案);不要在前端另写一套映射。
- 新增失败码后界面显示"未分类失败":按规则 1 在注册表登记条目并补测试,而不是在消费方添加特判。

## 相关模块

- `server/src/services/task/recoveryPlaybook.ts`
- `shared/types/recoveryPlaybook.ts`
- `server/src/services/task/TaskCenterService.ts`(详情装饰)
- `server/src/routes/recoveryPlaybook.ts`
- 相关:`chapter-automatic-recovery.md`(租约与人工暂停语义)、`docs/public/playbook/recovery-by-phase.md`(按阶段人工手册)

## 来源文档

- LOOP-12 计划:`../../../docs/plans/recovery-playbook.md`(2026-10-20)
