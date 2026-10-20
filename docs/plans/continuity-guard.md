# LOOP-7 计划 · 全书一致性守卫(INN-A2)

更新:2026-10-20
状态:进行中
配套:BACKLOG INN-A2 · 审计产物见 PROGRESS LOOP-7 条目

## 1. 背景与现状审计

已有基建(审计结论):
- `audit.chapter.full`(v2)通用审校已含 continuity/character/plot/mode_fit 四类报告,上下文已注入 `local_state`(角色当前目标/状态)、`world_rules`、`recent_chapters`、`structure_obligations`、`open_conflicts` 等分层块;
- `timelineCheckerService` 提供确定性时间线检查(未来事件泄露等窄类),经运行时包接入治理链;
- 审校问题 → `openConflictService.syncFromAuditReports` → 运行时 openIssues → blocking/质量债 → 修复/重规划治理动作,链路完整。

真实缺口:
1. 通用审校 prompt **没有对"时间线矛盾 / 角色动机违背 / 世界规则冲突"给出显式检查协议**,也没有专用问题码 —— LLM 是否检查、如何取证全凭自由发挥,不可验收、不可守卫;
2. 无确定性后处理:重复冲突、无证据冲突、超量冲突会原样进入治理链;
3. 无针对三类矛盾的结构化契约测试(链路级)。

## 2. 本轮设计(零新增 LLM 调用、零新增执行器分支)

### 2.1 审校 prompt v3:一致性守卫协议
`audit.chapter.full` v2→v3,system message 增加「一致性守卫」段:
- 三类必查:时间线矛盾(timeline)/ 角色动机违背(motivation)/ 世界规则冲突(world_rule),各给操作性定义;
- 强制专用 code:`continuity_timeline_conflict`、`continuity_motivation_conflict`、`continuity_world_rule_conflict`;
- evidence 必须引用被违背的具体事实(角色目标原文/规则条文/时间线事件),禁止"与前文不符"式空证据;
- severity 指引:影响后续章节执行的高影响冲突用 high/critical,仅影响本章读感用 medium,无明确依据不得输出。
- 注册表 key 同步 `audit.chapter.full@v3`;上下文预算沿用 `NOVEL_PROMPT_BUDGETS.chapterReview`(不改)。

### 2.2 确定性后处理(新增 `services/audit/continuityGuard.ts`)
- `CONTINUITY_GUARD_CODES` 常量三码;
- `normalizeContinuityGuardIssues`:守卫码问题规范化(去重、按 severity 排序、单报告上限 5 条、丢弃空证据/占位证据),非守卫码问题原样透传且顺序在后;
- 在 `AuditService.auditChapter` 的 auditReports 组装处应用 —— 下游(openConflicts、运行时 openIssues、blocking、治理动作、任务投影)全部沿用现有链路,不新增分支。

### 2.3 明确不做
- 不新增独立 LLM 调用/新 PromptAsset(避免每章额外成本;通用审校已持有全部所需上下文);
- 不改 timelineCheckerService(其窄类确定性检查继续独立生效);
- 不改前端(审校问题展示沿用现有问题面板);
- 不做跨章批量回溯重扫(后续轮次可选)。

## 3. 守卫测试(`server/tests/continuityGuard.test.js`)

1. helper 行为:三码规范化、同码同描述去重、单报告 >5 条截断且 high 优先、空/占位证据丢弃、非守卫码透传;
2. prompt 契约:v3 已注册且预算匹配;渲染产物含三个专用 code 与三类定义关键词;
3. 链路(验收「构造矛盾场景能检出并产出治理动作」的结构化等价物):以含 `continuity_world_rule_conflict`(high)的 auditReports 构造运行时包 → openIssues 含该码、进入 blockingIssueIds;medium 版本 → 不进 blocking、作为质量债;另证其它 high 问题仍 blocking(反证);
4. 版本引用同步:更新 `prompting.test.js`、`promptWorkbench.test.js` 中的 `audit.chapter.full@v2` 引用。

## 4. 验收对照(BACKLOG 原文)

- 「构造矛盾场景能检出」:prompt 协议明确三类检查 + 专用码 + 取证要求(检出正确性依赖真实模型,链路以结构化等价测试覆盖;真实检出在用户实际审校时验证);
- 「产出治理动作」:链路测试证明 high→blocking→修复/重规划,medium→质量债继续执行(复用统一治理动作,执行器零新增分支)。

## 5. 验证与记录

- `pnpm --filter @ai-novel/server test` 全量(基线 1395 测试 0 失败,本轮新增后重新计数);
- client 未改动,沿用 LOOP-6 全绿(typecheck 0 / 222 测试)结论;
- wiki:`docs/wiki/prompts/novel-generation-quality-guards.md` 增加一致性守卫契约段;
- PROGRESS LOOP-7、BACKLOG INN-A2 状态、release notes/user-facing bullet。
