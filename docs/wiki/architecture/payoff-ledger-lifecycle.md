# 伏笔账本生命周期(登记 → 推进 → 回收/逾期 → 提醒)

## Background

伏笔(Payoff)是本书对读者的承诺,跨章兑现是长篇质量的核心。系统以 canonical 单表 `PayoffLedgerItem` 收敛全书伏笔(6 态:setup / hinted / pending_payoff / paid_off / failed / overdue)。2026-10-18 审计(INN-A1)确认:上游已有双 AI 写路径与生成注入,但用户侧登记/标记缺失、逾期纯靠 AI 判定、无提醒通道。LOOP-5 收敛后本页记录生命周期契约。

## Decision

三条写路径 + 一条用户路径,状态语义分层:

- **AI 全量对账**(`PayoffLedgerSyncService.syncLedger`):按 Book Contract/宏观计划/卷章规划/快照重判全部条目;
- **AI 逐章增量**(`ChapterArtifactDeltaService.applyPayoffDeltas`):章节定稿后抽取推进;
- **用户手动**(`POST/PATCH /novels/:id/payoff-ledger`):登记新伏笔、标记已回收/放弃/重新打开;
- **确定性后处理**(对已结构化 AI 输出,不新增 AI 语义判定):过窗读时升格、停滞扫描、窗口内降级。

## Current Rule

1. **手动锁定**:任何用户状态标记写 `manualLocked=true`;锁定条目在对账 upsert、逐章增量、系统 stale/failed 标记三处均**不改写** currentStatus/statusReason/目标窗口(其余字段仍可更新)。「重新打开」= pending_payoff + 解锁,交还 AI。手动**登记**默认不锁定(AI 可继续推进)。
2. **逾期双通道**:存储态 overdue(AI 标记)+ **读时升格**(pending-like 且 `targetEndChapterOrder < chapterOrder`,`payoffLedgerShared.isPayoffOverdueAtChapter` 唯一判定口);存储态逾期在窗口内降级回 pending。所有消费方(注入分类、合成问题、planner 过滤)必须走共享分类函数,禁止本地重算。
3. **停滞扫描**:未终结且距 `lastTouchedChapterOrder ?? firstSeenChapterOrder` 超过 `PAYOFF_STALE_AFTER_CHAPTERS`(30)章 → `payoff_missing_progress` 合成问题(与紧急项按 `ledgerKey:code` 去重,紧急措辞优先)。
4. **逾期是质量债不是失败**:合成 `payoff_overdue` 问题**不进入 blockingIssueIds/blockingLedgerKeys**(`chapterRuntimePackageBuilders`),以 openIssues/质量债可见并影响重规划建议;否则修复重跑会复用冻结的逾期结论,系统性消耗修复预算(违反 completion-first)。
5. **回收计数**:canonical 快照携带 `narrative.payoffCounts`(paidOff/failed),运行时账本摘要据此给出真实回收数,`totalCount` 覆盖全部在册条目(回收率分母)。旧快照无该字段按 0 解析(向后兼容)。
6. **注入通道**:正文生成有两条必达通道(payoff_directives、obligation_contract 的"必须触碰的伏笔")+ 可选完整台账块;分类一律来自共享分类函数(紧急判定含 targetStart 条件)。
7. **提醒面**:导演质量工件把 overdue 映射进"需复核"口径(与 failed 同);大纲页签「资产约束」子页带逾期数徽标;卡片空态区分 加载中/读取失败(可重试)/无数据。
8. **参照章节**:紧急/逾期判定的 chapterOrder 取「当前写作进度」(选中章节 → 最后有正文的章节 → 最后一章),不是全书最后一章。

## Failure Modes

- 在消费侧本地重算 urgent/overdue(不走共享函数)→ 双口径复现(LOOP-5 前的旧病);
- 把逾期重新接回 blocking → 修复预算被冻结结论消耗;
- 手动标记不加锁 → AI 下一次对账覆盖用户的"已回收",用户结论丢失;
- 快照解析强制要求 payoffCounts(不 optional)→ 旧快照解析崩溃;
- 新增提醒时绕过"任务中心只读"红线(往任务中心塞伏笔行)。

## Related Modules

- `server/src/services/payoff/` — PayoffLedgerSyncService(对账+手动写)、payoffLedgerShared(分类/升格/合成问题)、payoffLedgerChapterRefs
- `server/src/services/novel/runtime/ChapterArtifactDeltaService.ts` — 逐章增量写路径
- `server/src/services/novel/state/CanonicalStateService.ts` — 快照分类与运行时账本
- `server/src/services/novel/runtime/chapterRuntimePackageBuilders.ts` — blocking 剥离
- `server/src/modules/novel/planning/http/novelPlanningRoutes.ts` — GET/POST/PATCH
- `client/src/pages/novels/components/BookPayoffLedgerCard.tsx` — 登记/标记交互与空态
- `shared/types/payoffLedger.ts`、`shared/types/canonicalState.ts` — 契约类型

## Source Documents

- 计划与处置表:`docs/plans/payoff-ledger-mvp.md`(LOOP-5,2026-10-18)
- 审计 26 条缺口与核实:`docs/workflow/PROGRESS.md` LOOP-5 条目
- 守卫测试:`server/tests/payoffLedgerMvp.test.js`
