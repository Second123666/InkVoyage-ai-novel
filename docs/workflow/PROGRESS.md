# 改进进度日志 · Progress Log

配套流程:[improvement-workflow.md](improvement-workflow.md) · 待办池:[BACKLOG.md](BACKLOG.md)
写法:**每轮一条,插入本文件顶部(最新在上)**;轮次未完成时用 `[/]` 标题占位,完成后补全。

条目格式:

```
## YYYY-MM-DD · LOOP-N · 标题
- **类别**: bugfix / 重构 / 功能收束 / 创新 / 流程
- **目标**: 这轮要解决什么
- **改动**: 动了哪些文件/模块,关键提交哈希
- **验证**: 跑了什么(命令/手工步骤)、结果如何
- **遗留**: 未尽事项(→ 已登记 BACKLOG #ID)
- **下一步**: 建议的下一轮选题
```

---

## 2026-10-20 · LOOP-9 · 角色弧线追踪(INN-A4)

- **类别**: 创新(A 线长篇记忆;主对话执行)
- **目标**: BACKLOG「拆书已有角色形象演变;扩展到性格/目标/关系演变,生成时注入角色当前阶段状态」。
- **现状审计**: 拆书形象演变(`BookAnalysisCharacterAppearanceService`)、手动演进(`evolveCharacter`:bible+时间线+RAG → 更新性格/状态/目标并写 `CharacterTimeline`)、关系阶段(dynamics)、当前状态(local_state)均已在;**真实缺口 = CharacterTimeline 演变流水完全不参与正文生成**。
- **改动**: `character_arc` 层接入分层记忆管道 —— 纯函数 `buildCharacterArcEvents`(每角色最近 3 条、截断、缺章序兜底);装配器取 `characterTimeline`(≤30 行)分组写入 `characterArcEvents`(package/writeContext 双 schema,旧数据兼容);writer 新块(priority 90,full 模式且参与者有数据才渲染,提示"延续此轨迹,不要凭空重置人设");requirements+preferredGroups 登记;provider contract 遥测(>3 章评估、degrade)。MVP 边界:evolveCharacter 仍手动触发(自动演进涉及新 LLM 调用与配额决策,留后续);关系演变沿用 dynamics 阶段不另建块。
- **验证**: server **1414 测试 / 1402 过 / 0 失败 / 12 跳过**(新增 4 条:分组/限量/兜底、writer 登记、块与装配静态契约、gating 行为);client 未动沿用 LOOP-6 结论。途中修 2 个自写缺陷:zod record 需显式键类型、测试内 readSource 路径拼接。
- **验收对照**: 「生成时注入角色当前阶段状态」= character_arc(轨迹)+ local_state(当前状态)+ dynamics(关系)三层共同构成,测试锁定;演进自动化与漂移实测留后续轮次。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-10 = INN-B1 全链路 Trace 与决策回放(M/P2)**;其后 B3 → B4 → C 线 → D 线。

## 2026-10-20 · LOOP-8 · 分层递归记忆(INN-A3 章→卷→全书)

- **类别**: 创新(A 线长篇记忆;主对话执行)
- **目标**: 落地 roadmap「长程上下文记忆」—— 卷摘要 + 全书状态快照稳定参与后段生成;验收:后段生成上下文含分层摘要。
- **现状审计**: 章层已有(摘要 + `recent_chapters` **仅全局最近 3 章**);卷层只有计划期 mission;**canonical 时间线只喂 PlannerService,正文 writer 收不到**。缺口 = 卷内滚动回顾 + 全书时间线快照两层。
- **改动**:
  1. `GenerationContextPackage`/`chapterWriteContextSchema` 增加 `volumeRecap`、`bookStateSnapshot`(可选默认 [],旧数据向后兼容);
  2. 新纯函数模块 `runtime/context/layeredMemoryContext.ts`:卷定位(`resolveCurrentVolumeChapterOrders`)、卷内回顾格式化(当前章之前 ≤8 条、截断 100 字)、全书快照(时间线过滤未来事件、按章序取最近 8 条);
  3. `GenerationContextAssembler` 单点装配:当前卷章序 → 查卷内 `chapterSummary`(≤8)→ 两字段写入 contextPackage;
  4. `buildChapterWriteContext` 映射(仿 previousChaptersSummary 模式);`chapterContextBlocks` 新增 `book_state_snapshot`(priority 91)/`volume_recap`(priority 89)两块,`mode==="full"` 且非空才渲染;
  5. writer 资产 `contextRequirements` 登记两组 + 进 `preferredGroups`(防预算静默丢弃,吸取 A1-G2 教训);
  6. provider contract 增两条(stages=write、章序>3 才评估、degrade 语义)—— 提供注入遥测(吸收 A1-G8 教训)。
- **验证**: server **1410 测试 / 1398 过 / 0 失败 / 12 跳过**(新增 5 条:快照过滤/排序/截断、卷定位与回顾、writer 登记契约、块与装配静态契约、gating decisions 行为);client 本轮未动,沿用 LOOP-6 结论(typecheck 0 / 222)。中途修 1 个类型错误(canonical 时间线 `chapterOrder` 可 undefined → 参数类型放宽)。
- **验收对照**: 「后段上下文含分层摘要」= writer 必达登记 + 门控 + 装配,测试锁定;「抽样对比漂移减少」= 真实生成对比,留所有者实测。
- **遗留**: review/repair 模式未注入两层(本轮只保 writer,按 MVP);记忆条数/预算微调依据 `ctx-budget` 日志;wiki 已沉淀(rag/knowledge-and-context-assembly)。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-9 = INN-A4 角色弧线追踪(M/P3)**;其后 B1 决策回放。

## 2026-10-20 · LOOP-7 · 全书一致性守卫(INN-A2)

- **类别**: 创新(A 线写作质量;主对话执行)
- **目标**: 章节生成后对**时间线矛盾、角色动机违背、世界规则冲突**做结构化校验,输出接入既有问题治理链(复用统一治理动作,执行器零新增分支)。
- **现状审计**(避免重复造轮子):通用审校 `audit.chapter.full` 已注入角色状态/世界规则/最近章节等上下文,确定性时间线检查器只覆盖窄类;真实缺口 = 无三类矛盾的显式检查协议、无专用问题码、无确定性后处理、无链路级契约测试。
- **改动**:
  1. **审校 prompt v2→v3**:system message 新增「一致性守卫」协议 —— 三类必查(时间线/动机/世界规则)操作性定义;强制专用码 `continuity_timeline_conflict`/`continuity_motivation_conflict`/`continuity_world_rule_conflict`;evidence 必须引用被违背的具体事实(角色目标原文/规则条文/时间线事件),禁止空证据;severity 分级指引(影响后续执行→high/critical,仅本章读感→medium);注册表 key 同步 `@v3`(预算不变,addendum 按 id 挂载不受版本影响);
  2. **确定性后处理** `services/audit/continuityGuard.ts`:守卫码规范化 —— 同码同描述去重(保留更严重版本)、按严重度排序、单报告上限 5 条、丢弃空/占位证据;非守卫码透传排后;纯规范化不做二次语义判定;
  3. **接线** `AuditService.auditChapter`:审校报告组装处应用后处理,下游 openConflicts→运行时 openIssues→blocking/质量债→修复/重规划**全部复用现有链路**,不新增 LLM 调用、不新增执行器分支;
  4. 版本引用同步(prompting/promptWorkbench 测试、prompting README 示例)。
- **验证**: server **1405 测试 / 1393 过 / 0 失败 / 12 跳过**(新增 3 条:规范化行为含反例、v3 注册+协议契约、**治理链测试**——high→blockingIssueIds、medium→质量债继续、其它 high 仍阻塞的反证);client 本轮未动,沿用 LOOP-6 全绿(typecheck 0 / 222)。途中修 2 个自写测试缺陷:夹具缺 `acceptance.missingObligations`、去重键未考虑严重度(升级为"保留更严重版本"的正确语义)。
- **验收对照**:「构造矛盾场景能检出」= prompt 协议 + 专用码 + 取证要求(真实检出依赖模型,由所有者实际审校验证);「产出治理动作」= 链路测试证明 high→blocking→修复/重规划、medium→质量债。
- **遗留**: 检出质量依赖模型按协议输出,若模型不输出专用码守卫会静默退化为普通审校(已记 wiki 失效模式);跨章批量回溯重扫、A3 分层记忆等后续轮次。
- **下一步**: 按所有者 2026-10-20 指示「按 backlog 顺序执行」→ **LOOP-8 = INN-A3 分层递归记忆(章→卷→全书摘要树)**。

## 2026-10-20 · LOOP-6 · 写法引擎视觉收敛(UI-1 第三批 A)

- **类别**: UI(按用户要求全程主对话执行,未使用 Workflow)
- **目标**: 落地 rollout 计划第三批中写法引擎的视觉收敛 —— 清除调色板硬编码色、删除局部暗色 hack、收敛超大创建弹窗。
- **基线更正(审计结论)**: rollout 计划记载第一/二批已于 2026-07-14 完成,经代码复核**属实**(语义 token `success/warning/info` 存在、`components/assetLibrary/` 共享组件被知识库/题材/基础角色三页引用);BACKLOG UI-1 旧描述("第一批待做")已更正为「进行中」并列出第三批剩余。LOOP-6 实际执行的是第三批 A。
- **改动**:
  1. `writingFormula` 模块 11 个组件 + 页面根,**~300 处调色板硬编码色**全部迁移语义 token:text-slate→foreground/muted-foreground,背景→background/muted,border→border,sky→info、amber→warning、emerald→success、rose→destructive;反色块统一 `bg-foreground text-background(/xx)`;
  2. 删除 `index.css` 中 40 行 `.writing-formula-theme` 暗色 hack 块(语义 token 自带明暗适配)与 4 处装饰渐变、1 处装饰阴影;
  3. 创建写法弹窗收敛:`max-w-5xl`→`max-w-4xl`、`h-[min(780px,92vh)]`→`h-[min(720px,90vh)]`;功能型工作台弹窗保留;
  4. 顺带修正 1 处改口式文案(「已经放到…里」→ 直述设置位置);
  5. 新增守卫 `client/tests/styleEngineVisualContracts.test.js`(模块零调色板类/无主题 hack/弹窗尺寸,含文件覆盖断言);
  6. 同步更正 BACKLOG UI-1 与 rollout 计划阶段状态。
- **验证**: client typecheck **0 错误**;client **222/222**(219 + 3 条新守卫);server 未改动,沿用 LOOP-5 全绿结果(1395 测试 0 失败)。类名有效性经 Tailwind 3.4 源码实证(`hsl(var(--x))` 的 `/40` 修饰符会生成 `hsl(var(--x) / 0.4)`)。UI 观感验收(明暗两套 × 三种主题)按仓库规则留给所有者。执行期间平台 Bash 安全分类器曾持续限流,恢复后完成验证。
- **遗留**: 第三批剩余(世界三页状态/推荐动作、设置页 17 处色值与 model-routes 组织、style-engine 嵌套 Card 与「资产库+编辑工作区」结构终态、anti-ai-rules 结构对齐)仍挂 UI-1;第四/五/六批未开始。
- **下一步**: UI-1 第三批剩余(建议先世界三页,色值几乎干净、以结构对齐为主)。

## 2026-10-18 · LOOP-5 · 伏笔账本 MVP(INN-A1)

- **类别**: 创新(A 线写作质量与长篇记忆;先审计后补缺,非从零建)
- **目标**: 把伏笔账本从「AI 只写、用户只看」变成**可登记、可标记、有确定性逾期兜底、有最小提醒面**的一等创作资产(验收①②③④)。
- **审计结论**(Workflow 四路扫描 + 合成 + 对抗核实,26 条缺口全部 confirmed):上游基建完整(双 AI 写路径 + 注入通道 + 只读卡片),验收②已达成;①③用户侧缺失(无登记/无标记/入口门控错位误显"账本为空");④未达成(overdue 纯靠 AI 标记、无提醒通道)。计划:`docs/plans/payoff-ledger-mvp.md`。
- **改动**(本轮 11 项收敛,全部手工实现——三个实现 agent 撞 429 配额阵亡后由主循环完成):
  1. **登记**:`POST /novels/:id/payoff-ledger`(`manual_<uuid>` 键、sourceRefs=manual、初始 setup、不加锁)+ 卡片「新增伏笔」表单;
  2. **标记**:`PATCH`(已回收/放弃/重新打开)+ `manualLocked` 双 schema 双迁移(纯增量列);锁定项在对账 upsert、逐章增量、系统 stale/failed 标记三处不被改写;「重新打开」解锁交还 AI;
  3. **入口修复**:大纲页签门控补 `outline`(误显"账本为空"根因)+ 空态区分加载中/读取失败(可重试)/无数据;
  4. **紧急参照**:改为当前写作进度(选中章节 → 最后有正文章节 → 最后一章),不再恒取全书最后一章;
  5. **过窗读时升格**:pending-like 且 `targetEnd < chapterOrder` → 读时视为逾期(`isPayoffOverdueAtChapter` 唯一判定口);注入侧分类复用共享分类函数,消除双口径;
  6. **停滞扫描**:未终结且超 30 章未触碰 → `payoff_missing_progress` 合成问题;
  7. **回收计数**:canonical 快照携带 `payoffCounts`,运行时摘要 paidOff/failed 不再恒 0,totalCount 覆盖全部在册条目;
  8. **逾期降质量债**:合成 `payoff_overdue` 从 blockingIssueIds/blockingLedgerKeys 剥离(修复重跑不再被冻结逾期结论拖死,符合 completion-first);
  9. **增量守卫统一**:applyPayoffDeltas 复用 `sanitizePayoffLedgerSyncItem`(堵住"无窗口 overdue"从逐章增量漏入);
  10. **提醒面**:导演质量工件 overdue→stale 进「N 项需复核」;大纲「资产约束」子页逾期数徽标;
  11. **文案**:卡片标题/说明改用户视角,VolumeCard 改口文案清除;快照区标注「以伏笔台账为准」。
  - 守卫测试 `server/tests/payoffLedgerMvp.test.js`(升格/停滞/计数/锁定行为/路由静态/客户端合同,含反证用例)。
- **验证**: client typecheck **0 错误**;client **219/219**;server **1402 测试 / 0 失败 / 12 跳过**(含双迁移对齐测试);亲自三镜头审查通过(范围 22 文件全在计划内、无残留、锁定语义与 G4 语义逐行核对);中途修 1 个类型错误(statusReason 缺 `| null`)与 1 个我自己的断言写反(setup 参与升格是计划语义)。
- **遗留**:
  - 注入保底/排序调优、上下文遥测、窗口行内编辑、卡片筛选跳转、同步状态标记与重试入口、验收死字段接线、sync_stale 消费、双轨快照合并、Markdown 导出清单、planner 空账本回退摘要仍为 0 → 合并登记 INN-A1b;
  - 子 agent 审查再次因 429 配额(23:05 重置)不可用,由主循环等价替代;审计本身 58.7 万 token。
- **下一步**: UI-1 设计系统第一批(轮次入口建议第 6 项),或按所有者兴趣另选。

## 2026-10-17 · LOOP-4 · 统一任务投影契约(INN-B2)

- **类别**: 创新(B 线 Agent 架构工程,P0;含契约修正类修复)
- **目标**: 消除"后端真实状态 / 运行记录 API / 前端展示"三层漂移 —— 任一长链任务状态三处可对照,不一致由守卫测试拦截。
- **改动**:
  - **契约审计**(先行):Workflow 四路并行扫描(后端状态源/任务中心 API/前端消费/导演投影)→ 三方对照表合成 → 对抗核实,**17 条发现:7 confirmed / 5 partly / 2 refuted / 3 low**。计划文档 `docs/plans/task-projection-contract.md`(处置表 + 收敛设计)。
  - **收敛实现**(§4 全落地):
    1. pmr 统一投影:Pipeline/Image/Style/Book 四适配器输出 `pendingManualRecovery`(有列即出、无列不出),前端 tone 对任意 kind pmr=true 输出 danger「需要恢复」;
    2. 任务中心读路径去副作用:list/detail 不再隐式 heal 写库(heal 改显式 opt-in;follow-ups revalidate、写操作后归一化、启动/后台对账通道保留);
    3. 步骤区 pmr 语义:详情步骤在 pmr 时不再把当前步标 failed(改中性 queued,与「等待手动恢复」头部一致);
    4. displayStatus 中文化:"Failed with generation alerts" → 「存在待处理的质量提醒」;
    5. sourceRoute 单一构造器:`buildNovelWorkflowSourceRoute` 收敛任务中心与恢复候选两套路由(无目标回落 /tasks 深链,simple 体验统一 /novels/:id/simple);
    6. attentionCount 权威计数:overview 新增服务端「需要处理」计数(失败排除纯质量提醒码 + pmr + 重规划,与前端 isTaskMustHandle 逐码同口径),任务中心摘要卡与侧边栏徽标统一消费,删除本地双口径与死分支;
    7. cancelled 中性化:DirectorDisplayMode/DirectorDashboardMode/AITakeoverMode/NovelEditTakeoverState 全链新增 `cancelled`(「已取消」中性终态,不折入 failed、不提供恢复动作),首页 next-action 把 cancelled 与 failed 分离;
    8. 小说页本地映射守卫:novelEditAutomationStatus 输出词表锁定 ⊆ TaskStatus(防后端契约变更时前端静默漂移)。
  - **守卫测试**:`server/tests/taskProjectionContract.test.js`(§5 六条:统一契约字段+pmr 白名单、英文残留、sourceRoute 单一构造器、GET 无 heal、pmr 步骤非 failed、attentionCount 同口径)+ client 侧 pmr/词表守卫(client 测试 215→219)。
  - **执行方式记录**:审计与实现各用一个 ultracode Workflow;实现轮中 S1/S3 与三个审查 agent 撞 429 配额阵亡,S2/C1/守卫/验证存活;**剩余实现与全部三镜头审查由主循环手工完成**(S1 剩余、S3 全链、守卫留白、审查),等价完成 DoD。
- **验证**:
  - client typecheck **0 错误**;client **219/219**;server fast **1395 测试 / 0 失败 / 12 跳过**(全部为最终态全量重跑);
  - 审查(主循环亲自三镜头 + 一处疑点核实):attentionCount 与前端质量码口径逐一比对 —— workflow 行 failureCode 恒为 NOVEL_WORKFLOW_FAILED,质量码仅出现在 pipeline lastErrorType,服务端排除逻辑与前端一致,疑点排除;范围/红线/文案全过,无调试残留。
- **遗留**:
  - 挂起发现登记 BACKLOG:BUG-5(阶段词表中英分裂,INC-8)、BUG-6(拆书步骤词表缺口,INC-9)、BUG-7(命令入队清 pmr 需产品语义决策,INC-3)、BUG-8(混合视图隐藏与 overview 计数不对齐,INC-17);
  - INC-16(DirectorRuntime 四张执行面表本仓库无写入方)记入 wiki 失败模式,归属确认前无法在本仓库闭合验证;
  - waiting_approval 筛选在无该态的 kind 上恒空(INC-10/11)属设计性语义,记入 wiki 页面说明即可,不另设条目;
  - 子 agent 审查因 5 小时配额(2026-10-18 00:09 重置)未能执行,由主循环等价替代;后续大轮注意配额余量。
- **下一步**: LOOP-5 伏笔账本 MVP(INN-A1)。

## 2026-10-17 · LOOP-3 · 衍生工坊实验化(FEAT-1/2)

- **类别**: 功能收束(产品取舍已有所有者结论:2026-10-15 拍板漫画/短剧降级为实验特性)
- **目标**: 漫画/短剧降级为实验特性 —— 导航入口标注"实验"、设置总开关可隐藏、短剧明示模拟成片、公开文档标实验状态;主链 UI 不受干扰、既有功能不回退、路由始终可直达。
- **改动**:
  - **注册表与联动**:`client/src/config/experimentalFeatures.ts`(路径→特性映射,纯函数、storage 可注入)+ `client/src/hooks/useExperimentalFeatures.ts`(useSyncExternalStore,设置切换后侧边栏/移动端菜单同 tab 即时重渲染)。
  - **桌面侧边栏**:漫画/短剧 amber"实验"徽标(漫画 Beta 徽标替换);短剧入口从 `disabled`/"即将推出" 改为可用入口(移动端本就可用,两端一致);按注册表过滤被隐藏项,`disabled` 渲染分支保留但当前无使用者。
  - **移动端更多入口**:同路径过滤 + 实验徽标;**合同文件 `mobileSiteNavigation.ts` 未动**,既有导航合同测试不受影响。
  - **设置总开关**:系统设置 → 外观与主题 新增"实验特性"卡,"在导航中显示实验特性入口"总开关(默认开;关 = 隐藏两个入口;部分态按关呈现,打开统一显示)。
  - **短剧模拟成片提示**:新增 `DramaVideoNotice` 提示条挂载短剧工作台与项目页;文案为"默认使用模拟演示通道,未接入真实视频生成服务时不会产出真实视频"(经审查去掉绝对化表述,配置了 `DRAMA_VIDEO_HTTP_CREATE_URL` 真实通道的部署下仍准确)。
  - **文档**:public 两模块页 H1 后加"状态:实验特性"引用块;introduction/usage-guide/README 功能区标注实验状态;新 wiki 页 `docs/wiki/product/experimental-features.md` 沉淀"注册表 → 徽标/过滤 → 总开关 → 文档标注"规则链与"入口隐藏 ≠ 路由下线"等失败模式。
  - **测试**:新增 `client/tests/experimentalFeatures.test.js`(默认可见、损坏 JSON 回退、路径映射含子路径、注册表形状)。
  - **验证阶段发现并修复 1 个 LOOP-2 漏网陈旧断言**:`novelAutoDirectorProgressPanelQueryKeys.test.mjs` 仍断言 `dashboardView?.mode`,而源码早已演进 `dashboardViewForDisplay`(任务 failed/cancelled 时置空)—— 在 HEAD 上即失败,属测试陈旧,对齐后**单独提交**,不混入功能提交(对抗审查确认的唯一 medium 发现)。
  - **审查修正 3 处**(low):提示条与徽标 title 统一全角标点;短剧/文档/README 三处"未接入"绝对化表述统一为"默认使用模拟演示通道 + 未接入时不会产出真实视频"。
- **验证**:
  - 执行方式:ultracode Workflow(3 个互斥文件簇并行实现 → typecheck/client/server 验证修复循环 → 文案规则/回归合同/范围红线三镜头对抗审查,10 agent),会话中断一次后按 runId 断点续跑;
  - 最终:**client typecheck EXIT=0**;client 全量测试 **215/215 通过**(文案修正后复跑);server fast **1383 测试 / 0 失败 / 12 跳过**(本轮早前跑出,其后无 server 改动,按验证复用规则沿用);
  - 审查:6 条发现 → 对抗确认 1(范围外测试,已单独处置)+ low 5(标点×2、绝对化表述、范围外归属——均已处置);
  - UI 验收按仓库规则留给所有者:开关切换联动、徽标显示/隐藏、短剧提示条、明暗主题。
- **遗留**:
  - **client 测试基线口径**:全量为 **215**(`tests/*.test.js` + `src/**/*.test.mjs`),LOOP-1/2 记录的 92 只是子集,`.mjs` 部分未被计入——那个陈旧断言因此漏到本轮才暴露;今后 L3 一律以 `pnpm --filter @ai-novel/client test` 全量为准;
  - 移动端路由元数据未登记 `/settings/appearance`(→ 新登记 BUG-4);
  - 移动端更多菜单不含漫画入口(既有合同如此,漫画仅桌面入口);若要补齐属导航合同变更,另行排期。
- **下一步**: LOOP-4 统一任务投影契约(INN-B2)。

## 2026-10-16 · LOOP-2 · 套件绿化(BUG-1/2)

- **类别**: bugfix(真 bug 修复 + 架构脆弱点断环 + 陈旧测试对齐 + 测试基建)
- **目标**: 38 个失败测试(server 33 + client 5)全部清零,基线转绿,让后续每轮 L3 验证可信。
- **改动**:
  - **真 bug ×3(代码修复)**:
    1. `bookAnalysis.budget.ts`:token 预算从 read-modify-write 恢复为原子 `increment`(NULL 列一次性绝对值引导写),修复批量拆书并发丢计数(测试暴露 2≠4);
    2. `chapterArtifactDelta.prompts.ts`:`characterResourceDeltas` 补 `.max(8)`(此前仅 prompt 约束、schema 不设防);
    3. `bookAnalysisToolSchemas/Tools`:zod 类型经 `QualityDebtChapterAttribution` 下沉 schema 模块,工具文件不再 import zod(守卫测试意图成立)。
  - **架构脆弱点 ×3**:`NovelDirectorIdeaInspirationService` 归位 `director/idea/`(满足根目录边界守卫,2 处引用同步);`creativeHubContextResolvers` 服务层单例改调用时惰性加载(切断 prompting→services 循环依赖,修复 4 个文件的冷启动 "is not a constructor");`run-tests.cjs` fast 模式从单进程 require 全部文件改为 `node --test` 进程隔离(根治跨文件 require.cache 污染类失败)。
  - **陈旧测试 ×~22 文件**:按系统化分诊逐条对齐现行契约(方法改名 applyCharacter*Dialogue*、领域模型 proposal→dialogueInfluence、事件驱动替代直接重建、断点续跑钳制区间、审批审计批量化、展示目录 +world_setup、prompt v3、continue 枚举收敛等),每处都先对源码/git 历史确认"有意演进"再改测试;`novelPlanningService` events stub 补 `on()`。
  - **前端 ×4**:`index.css` 补 5 个移动端路由选择器;`TaskCenterFilterPanel` 恢复两行三列移动合同(显式定位 + md 释放 + xl order-last,激活态 data 属性驱动);两个导航/设置合同测试对齐 31 条现行元数据与独立 model-routes 页。
- **验证**:
  - server fast:`node scripts/run-tests.cjs fast` → **1383 测试 / 1371 过 / 0 失败 / 12 跳过,EXIT=0**(spawning 进程隔离);
  - client:`typecheck` 绿;`node --test` → **92 / 92 过,0 失败**;
  - UI 走查(任务筛选面板改动):移动 390×844 实测栅格 `[类型,状态,异常] / [keyword 207px 跨列,排序]` 两行 ✓;激活态 `rgba(239,68,68,0.1)` 底 + 红字 ✓;桌面 1440×900 模板 `[150,150,1fr,220px,auto]` 与视觉顺序 类型→状态→keyword→排序→异常 ✓;0 新增控制台错误(dev 换手期 tasks API 瞬断为旧进程占端口所致,恢复后 200)。
- **遗留**:
  - `dramaPipelineContract` 等仍向 require.cache 注入假模块且不还原 —— 进程隔离后无害,**勿回退单进程跑法**;
  - prompting→services 同类顶层依赖未全面排查 + rag/index 顶层实例化(→ RF-5);
  - BUG-3(pnpm 配置 WARN)未动(不在本轮范围);
  - 分诊决策"事件驱动取代 outline 阶段直接重建"基于移除提交(42732301)同批引入事件处理器 + 门禁显式排除该 reason 的证据链;若产品希望恢复逐章重建,需同时改 `shouldRebuildCharacterDynamics` 门禁与 outline 测试两处。
- **下一步**: LOOP-3 衍生工坊实验化(FEAT-1/2)。

## 2026-10-16 · LOOP-1 · 项目体检基线(BUG-0)

- **类别**: bugfix(体检 / 缺陷收集,本轮不修复)
- **目标**: 建立质量基线 —— 全量 fast 测试 + client typecheck/test + 主链冒烟,产出具体缺陷清单,让后续每轮验证有可信对照。
- **改动**: 无代码改动;BACKLOG BUG-0 标记完成,新增 BUG-1(server 33 失败)/ BUG-2(client 5 失败)/ BUG-3(pnpm 配置 WARN);轮次入口建议更新。
- **验证**:
  - **环境**:Node v24.14.0,Windows;git 工作区干净(仅本轮文档)。
  - **server fast 套件**:`pnpm --filter @ai-novel/server test` → **1383 测试 / 1338 过 / 33 失败 / 12 跳过**。失败全名单(33 条,散布 20 个文件):
    1. NovelExportService exports generated chapters as a knowledge document for diagnosis
    2. NovelReferenceService formats structured timeline nodes by phase
    3. RagRetrievalTracer writes sampled trace summaries without chunk text
    4. StyleRewriteService includes preview anti-ai rules in the repair prompt
    5. agent tool definitions keep zod declarations in dedicated schema modules
    6. artifact delta expires accepted influence proposals once their window has passed
    7. artifact delta only applies accepted influence proposals that are active in this chapter
    8. auto director auto-approval audit loads the latest 10 records per novel
    9. buildExportContent uses novel title plus timestamp as export filename
    10. buildPayoffLedgerResponse orders items by risk and computes summary counts
    11. chapter character context includes compact visible profile summary
    12. character mind persistence archives the old current snapshot before creating a replacement
    13. character resource extraction schemas cap resource deltas at eight items
    14. checkpoint: active running claim does not start another extraction
    15. continue_existing chapter takeover does not reuse the requested auto execution range
    16. director character phase applies an existing draft cast option without regenerating
    17. director planning stages expose standard node adapter contracts
    18. director root stays limited to compatibility facades
    19. display state keeps running mode when task is running despite stale approval projection
    20. display state maps chapter draft execution into chapter stage and uses fact progress
    21. drama service pipeline keeps repairable quality issues before storyboard and video tasks
    22. gateway delegates novel theme world generation through novel world service
    23. generateAllCandidates skips generated rows and processes failed candidates
    24. generateCharacterProfile transitions candidate to generated with arcs and scenes
    25. identifyCharacterCandidates dedupes candidates and keeps generated rows intact
    26. legacy generateCharacters identifies then generates profiles
    27. novel theme world prompt stays within a one-shot JSON budget
    28. novel workflow continue route accepts range and full-book continuation modes
    29. pipeline execution lease: non-schema claim failure does not pause a valid owner
    30. pipeline execution lease: ownership storage failure pauses before executor work
    31. runDirectorStructuredOutlinePhase persists chapter detail after each completed chapter
    32. runDirectorStructuredOutlinePhase resumes from the next incomplete chapter
    33. sanitizeStyleContextForGeneration redacts source entities before writer context
  - **client**:`pnpm --filter @ai-novel/client typecheck` **通过**;test → **92 测试 / 87 过 / 5 失败**:
    - every routed page has a route-specific mobile CSS landing point
    - mobile more menu contains all non-primary registered pages
    - mobile route metadata covers every registered page
    - mobile task filters stay in a compact three-column control grid
    - 设置路由提供四个独立页面并兼容旧模型路由链接(期望 model-routes 是重定向,代码已是独立页面)
  - **主链冒烟**:dev 环境 15 秒就绪(server :3000 health OK / client :5173 200)。Playwright 走查 7 页:`/`、`/novels`、`/tasks`、`/creative-hub`、`/auto-director/follow-ups`、`/comic`、`/settings` —— 全部正常渲染,**0 控制台错误**;API 全部 200(health、llm-selection、api-keys、quick-setup、follow-ups overview、tasks overview、knowledge documents、recovery-candidates)。两个 `/api/*` ERR_ABORTED 为页面导航中断、随即重试成功,不计缺陷;follow-ups overview ~3 秒轮询为设计行为,不计缺陷。
- **遗留**:33 + 5 条失败未分诊(→ BUG-1/BUG-2);pnpm WARN(→ BUG-3);冒烟只覆盖页面加载层,未触发真实生成链路(需 API 额度,留待真实创作时验证)。
- **下一步**: LOOP-2 套件绿化(BUG-1/2 分诊:真 bug 修码、陈旧测试更新、环境差异记档),使基线转绿。

## 2026-10-15 → 10-16 · LOOP-0 · 建立改进工作流(含 UI 工作线)

- **类别**: 流程
- **目标**: 为接手后的持续改进建立 loop engineering 工作流:循环协议、待办池、进度日志三件套。
- **改动**: 新增 `docs/workflow/improvement-workflow.md`、`docs/workflow/BACKLOG.md`、`docs/workflow/PROGRESS.md`。
  本轮同时沉淀已确认的战略决策:定位 = 个人开源作品 + 技术学习作品集 + 自用创作工具;漫画/短剧降级为实验特性(FEAT-1/2);与上游完全独立发展;创新覆盖 A/B/C/D 四条线。
  2026-10-16 补充(所有者要求丰富计划):新增前端 UI 改进工作线 —— BACKLOG 加 UI-1..5 五条(挂靠既有设计系统、rollout 分批计划、可视化栈定盘三份文档),工作流升 v1.1(轮次类别加 UI 类、L2 补 UI 规范、L3 补 client typecheck 与明暗/响应式走查要求),轮次入口建议加 UI 并行入口。
- **验证**: 文档自审(无占位符、backlog 条目均带验收标准、格式一致);纯文档改动不影响运行时,未跑测试。
- **遗留**:
  - ~~BACKLOG 首批优先级为建议值,待 LOOP-1 体检结果校准~~(已按 LOOP-1 结果校准,见轮次入口建议);
  - OPS-2(品牌/命名)待所有者拍板。
- **状态**: 已按 L5 提交(`f2a60f20`,2026-10-16)。
- **下一步**: LOOP-1 项目体检基线(BUG-0)→ 已执行,见上一条。
