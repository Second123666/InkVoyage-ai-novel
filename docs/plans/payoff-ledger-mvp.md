# LOOP-5 计划 · 伏笔账本 MVP(INN-A1)

更新:2026-10-18
状态:进行中
配套:BACKLOG INN-A1 · 审计产物见 PROGRESS LOOP-5 条目

## 1. 背景与验收对照(审计结论)

上游已有完整伏笔基建:canonical `PayoffLedgerItem`(6 态)、双 AI 写路径(全量对账 + 逐章增量)、计划期/写作期注入、只读卡片。2026-10-18 审计(26 条缺口,20 条 medium+ 全部核实)对照 INN-A1 验收:

| 验收 | 结论 | 缺口 |
|---|---|---|
| ① 能登记伏笔 | **部分达成**(用户侧缺) | 无手动登记入口,全靠 AI 抽取(A1-G1) |
| ② 生成时被引用 | **已达成** | 保底通道成立;完整台账块保底/排序调优后置(G2/G5/G6/G7) |
| ③ 回收状态可视化/可标记 | **部分达成** | 可视化有但入口门控错位(误显"账本为空",G12)、紧急参照错(G13);**"可标记"完全缺失**(G10/G11) |
| ④ 长期未回收有提醒 | **未达成** | 无提醒通道(G16);overdue 无确定性兜底、纯靠 AI 标记(G4);无停滞扫描(G17) |

**本轮目标**:把账本从"AI 只写、用户只看"变成**可登记、可标记、有确定性逾期兜底、有最小提醒面**的一等创作资产。

## 2. 本轮范围(收敛设计)

### 2.1 登记与标记(验收①③)
- **A1-G1 手动登记**:`POST /novels/:id/payoff-ledger`(title/summary/scopeType/可选目标窗口);`ledgerKey` 服务端生成 `manual_<cuid>`;sourceRefs 写 `kind=manual`;直接写现有模型。卡片加「新增伏笔」表单。
- **A1-G10 手动标记**:`PATCH /novels/:id/payoff-ledger/:itemId`(status/statusReason/可选目标窗口)。动作:标记已回收(paid_off)/标记放弃(failed)/重新打开(pending_payoff + 解除锁定)。
- **手动锁定语义(防 AI 覆盖)**:新增 `manualLocked Boolean @default(false)`(双 schema + 双迁移,镜像 `style_extraction_task_usage` 先例)。锁定项:AI 对账与逐章增量**不得改写** currentStatus/statusReason/targetStart/targetEnd(仍可更新 summary/evidence/confidence);系统 stale/failed 标记同样跳过。「重新打开」解除锁定交还 AI。
- **A1-G11(API 层)**:PATCH 支持目标窗口字段;UI 行内编辑窗口后置(→ BACKLOG)。

### 2.2 入口修复(验收③可达性)
- **A1-G12**:`shouldLoadPayoffLedger` 门控加 `"outline"`(一行);空态区分「加载中/无数据/同步失败」。
- **A1-G13**:「紧急」参照章节改用当前写作进度(最后已定稿章节/用户选中章节),不再恒取全书最后一章。

### 2.3 确定性兜底与计数(验收④数据基础)
- **A1-G4 逾期升格**:`payoffLedgerShared` 统一分类 —— pending-like 且 `targetEndChapterOrder < chapterOrder` 读时**升格** overdue(保留现有窗口内降级规则);`CanonicalStateService` 注入分类复用同一函数(消除双口径)。
- **A1-G17 停滞扫描**:`lastTouchedChapterOrder` 距当前 > 阈值(复用角色资源 stale 机制,阈值先 30)且未终结 → 复用 `payoff_missing_progress` 合成问题 code 输出。
- **A1-G21 回收率计数**:`buildRuntimeLedgerFromCanonical` 补算 paid_off/failed 计数(现有查询已取全量,无 schema 变更)。

### 2.4 最小提醒面(验收④可见性)
- **A1-G14**:导演工件把 overdue 映射为 stale/needs-review,复用现有「N 项需复核」角标(一处映射)。
- **A1-G16(最小)**:大纲页签「资产约束」子页标签加逾期数徽标(数据来自既有 summary.overdueCount);不引入通知系统、不动任务中心(遵守其只读定位)。

### 2.5 正确性与合规
- **A1-G20**:装配期冻结的合成 `payoff_overdue` 问题从 blocking 判定剥离(降为质量债/警告),符合 completion-first 与"质量债务≠失败"既定策略。
- **A1-G22**:逐章增量路径复用 `sanitizePayoffLedgerSyncItem`,统一两条写路径守卫。
- **A1-G26**:`VolumePayoffOverviewCard` 改口式文案改为直接指引。

### 2.6 明确后置(登记 BACKLOG)
注入保底与排序调优(G2/G5/G6/G7)、上下文遥测与配置对齐(G8/G9)、窗口行内编辑 UI(G11-UI)、卡片筛选与章节跳转(G15)、同步状态标记与重试入口(G18)、验收死字段接线(G19)、sync_stale 消费(G23)、双轨快照说明(G24)、Markdown 导出伏笔清单(G25)。

## 3. 守卫测试

- 服务端:manualLocked 语义(锁定项在 sync 合并与 delta 应用中不被改写 —— 对合并/跳过助手做行为测试);G4 升格函数(过窗升格、窗口内降级、无窗口不升格);G17 停滞判定;G21 计数;G22 静态断言(delta 路径调用 sanitize);G20 断言 payoff_overdue 不再进入 blockingIssueIds;路由守卫(POST/PATCH 存在且校验)。
- 客户端:卡片交互静态合同(按钮/表单存在)、门控含 outline、G13 参照章节取值。

## 4. 验证

- `pnpm --filter @ai-novel/server test`(fast 全量,基线 1395/0 失败)
- `pnpm --filter @ai-novel/client typecheck` + `pnpm --filter @ai-novel/client test`(基线 219/219)
- 迁移安全:纯增量列(默认值),双 schema + 双迁移 + 对齐测试;无数据丢失风险
- 完成后:wiki 更新(账本生命周期契约并入既有页面或新增 `docs/wiki/architecture/payoff-ledger-lifecycle.md`)

## 5. 风险与回退

- **迁移**:双 provider 迁移需对齐测试通过;失败回退整个 schema 提交(纯增量,回滚无数据损失)。
- **锁定语义影响对账**:若 AI 长期无法接管被锁项导致账本陈旧,用户可「重新打开」解除;后置项 G18 会补同步状态可见性。
- **G20 降级**改变验收判定:原 blocking 逾期不再拖垮章节 pass —— 属既定 completion-first 策略的方向性修正,审计确认现行行为会系统性消耗修复预算;若产品需要逾期硬阻断,恢复点在该函数单处。
- 每项独立 commit 粒度可回滚。
