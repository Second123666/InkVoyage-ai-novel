# LOOP-12 计划 · 失败模式 → 恢复动作知识库(INN-B4)

更新:2026-10-20
状态:进行中
配套:BACKLOG INN-B4

## 1. 现状审计

- 跟进层已有 11 个 reason → 动作解析(带风险等级/确认),恢复手册(`docs/public/playbook/recovery-by-phase.md`)是人工文档;
- 结构化失败信号散落在适配器 failureCode(14 个码)、noticeCode(PIPELINE_QUALITY_REVIEW/PIPELINE_REPLAN_REQUIRED/CHAPTER_TITLE_DIVERSITY)、章节 failureClassification(none/draft_generation_failed/draft_obligation_unmet/draft_repair_exhausted/replan_required);
- **缺口**:没有"结构化失败码 → 原因解释 + 恢复动作 + 是否可重试"的程序内注册表,运行时与 UI 无法据此给出统一恢复指引。

## 2. 设计(S–M,零新 LLM 调用,确定性映射)

1. **共享契约** `shared/types/recoveryPlaybook.ts`:`RecoveryPlaybookEntry{ code,label,explanation,recommendedActions[],mode(auto_retry|user_action|replan|inspect),retryable }`;
2. **注册表** `services/task/recoveryPlaybook.ts`:覆盖全部既有 failureCode/noticeCode/failureClassification 码 + 兜底条目;`resolveRecoveryGuidance({failureCode,noticeCode,failureClassificationCode,pendingManualRecovery})` 优先级 = 待手动恢复(最高) > failureCode > noticeCode > classification > null(未知码给兜底而非直通原文);
3. **接线**:`TaskCenterService.getTaskDetail` 统一附加 `recoveryGuidance`(UnifiedTaskDetail 可选字段;适配器零改动,单一装饰点);
4. **只读目录端点** `GET /api/recovery-playbook`(UI/Agent 后续消费);
5. **不做**:可执行恢复 mutation(动作仍在源页面/跟进执行器)、按阶段手册结构化迁移(文档保留)、自动恢复策略引擎(后续)。

## 3. 守卫测试

目录覆盖全部已发现码;解析优先级与兜底;条目形状(动作非空/mode 合法);TaskCenterService 装饰点静态契约;端点只读与挂载静态契约;共享字段声明。

## 4. 验收对照

「常见暂停/失败原因沉淀为结构化 原因→恢复动作」= 注册表 + 解析器;「自动导演恢复更聪明」= 任务详情统一携带指引(前端展示后置);人工恢复语义优先不被覆盖。

## 5. 验证

server fast 全量;client 未动沿用既往结论;wiki(workflows)增知识库页;PROGRESS/BACKLOG([x]+✅);发布说明:内部字段(UI 未消费),跳过并注明。
