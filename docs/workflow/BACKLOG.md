# 改进待办池 · Backlog

更新:2026-10-25
配套流程:[improvement-workflow.md](improvement-workflow.md) · 进度:[PROGRESS.md](PROGRESS.md)

状态标记:`[ ]` 待做 · `[/]` 进行中 · `[x]` 完成 · `[~]` 冻结/搁置 · `[!]` 降级为实验
ID 规则:`FEAT` 残缺功能收束 · `INN` 创新 · `RF` 重构 · `UI` 前端体验 · `BUG` 缺陷 · `OPS` 开源就绪
规模标记:S(≤1 轮)· M(1–3 轮)· L(多轮,需拆分)

## 轮次入口建议(2026-10-15)

1. ~~**LOOP-1 项目体检基线**(BUG-0)~~ ✅ 已完成(2026-10-16):基线 = server 33 失败 / client 5 失败 / typecheck 绿 / 冒烟 7 页 0 报错。
2. ~~**LOOP-2 套件绿化**(BUG-1/2)~~ ✅ 已完成(2026-10-16):server fast **0 失败**(进程隔离)+ client **92/92**;含 3 个真 bug 与 3 处架构脆弱点修复。
3. ~~**LOOP-3 衍生工坊实验化**(FEAT-1/2)~~ ✅ 已完成(2026-10-17):实验徽标 + 设置总开关 + 短剧模拟成片提示 + 文档/wiki 标注;client 215/215、server 0 失败。
4. ~~**LOOP-4 统一任务投影契约**(INN-B2)~~ ✅ 已完成(2026-10-17):审计 17 项发现收敛落地,三层可对照 + 守卫测试;残留发现登记为 BUG-5..8。
5. ~~**LOOP-5 伏笔账本 MVP**(INN-A1)~~ ✅ 已完成(2026-10-18):审计 26 项缺口收敛落地 —— 手动登记/标记+锁定语义、过窗读时升格、停滞扫描、回收计数、逾期降质量债、最小提醒面;残留调优登记 INN-A1b。
6. ~~**UI 线并行入口**(UI-1 第一批)~~ ✅ LOOP-6 完成(2026-10-20):复核发现第一/二批上游已完成,本轮执行真实剩余的第三批 A(写法引擎视觉收敛);UI-1 余项挂账。
7. ~~**LOOP-7 一致性守卫**(INN-A2)~~ ✅ 完成(2026-10-20):审校 v3 三类矛盾协议 + 确定性规范化 + 治理链守卫。
8. ~~**LOOP-8 分层递归记忆**(INN-A3)~~ ✅ 完成(2026-10-20):卷内回顾 + 全书时间线快照注入后段生成,含遥测与 5 条守卫。
9. ~~**LOOP-9 角色弧线追踪**(INN-A4)~~ ✅ 完成(2026-10-20):CharacterTimeline 演变轨迹注入 writer(character_arc 块 + 遥测)。
10. ~~**LOOP-10 全链路 Trace 与决策回放**(INN-B1)~~ ✅ 完成(2026-10-20):章级四段轨迹持久化 + 只读 API。
11. ~~**LOOP-11 成本感知模型路由**(INN-B3)~~ ✅ 完成(2026-10-20):按书计量流水 + 价格配置 + 当前/经济/强模型成本对比报告。
12. ~~**LOOP-12 恢复动作知识库**(INN-B4)~~ ✅ 完成(2026-10-20):20 条目注册表 + 任务详情统一恢复指引 + 只读目录端点。
13. ~~**LOOP-13 故事世界图谱 · 首轮**(INN-C1)~~ ✅ 完成(2026-10-21):小说级图谱投影 + 只读端点。
14. ~~**LOOP-14 故事世界图谱 · 前端渲染**(INN-C1)~~ ✅ 完成(2026-10-21):图谱页 + React Flow 画布(懒加载)+ 移动端合同,INN-C1 整项打勾。
15. ~~**LOOP-15 生产看板**(INN-C2)~~ ✅ 完成(2026-10-21):生产看板页(复用 simple-shelf + volumes 投影)+ 工作区入口 + 移动端合同,章节状态/债务热点/卷进度一屏总览。
16. ~~**LOOP-16 变更 diff 预览**(INN-C3)~~ ✅ 完成(2026-10-21):卷战略/节奏拆章保存前统一 diff 确认;既有章节 AI 改写与版本历史 diff 保持。
17. ~~**LOOP-17 token 预算与成本报表**(INN-D1)~~ ✅ 完成(2026-10-22):本书预算 + 章节边界熔断 + 看板成本面板。
18. ~~**LOOP-18 本地模型离线跑审校与摘要**(INN-D2)~~ ✅ 完成(2026-10-23):兼容层审计 + 一键本机预设 + 免密钥文案 + Qwen 分类修复。
19. ~~**LOOP-19 批量生成吞吐优化**(INN-D3)~~ ✅ 完成(2026-10-23):角色外显资料批量生成改有界并发(3),顺序与失败语义不变。
20. ~~**LOOP-20 RF-1 首个文件拆分**(`worldStructure.ts`)~~ ✅ 完成(2026-10-23):按责任拆为 shared/normalize/legacy/projection + 门面,行为不变。
21. ~~**LOOP-21 RF-1 第二个文件拆分**(`worldVisualization.ts`)~~ ✅ 完成(2026-10-23):按 shared/faction/geography/payload 拆分,行为不变。
22. ~~**LOOP-22 RF-1 第三个文件拆分**(`world.prompts.ts`)~~ ✅ 完成(2026-10-24):按提示词族拆分,14 个资产与注册路径不变;全量通过。
23. ~~**LOOP-23 RF-1 第四个文件拆分**(`ChapterArtifactDeltaService.ts`)~~ ✅ 完成(2026-10-24):拆出 shared 工具与伏笔消费者,公共 API 与行为不变;全量通过。
24. ~~**LOOP-24 RF-1 第五个文件拆分**(`comicRoutes.ts`)~~ ✅ 完成(2026-10-24):拆为 8 个领域注册器 + schemas/context + 23 行入口,64 条路由与注册顺序不变;同轮达成 RF-2。
25. ~~**LOOP-25 RF-1 第六个文件拆分**(`novelDirectorTakeover.ts`)~~ ✅ 完成(2026-10-24):拆为 7 个子模块 + index 门面,纯函数无 IO,行为不变。
26. ~~**LOOP-26 RF-1 第七个文件拆分**(`RagIndexService.ts`)~~ ✅ 完成(2026-10-24):拆出纯分块、源加载、嵌入批处理,服务保留队列与编排,行为不变。
27. ~~**LOOP-27 RF-1 第八个文件拆分**(`promptRunner.ts`,最后一个)~~ ✅ 完成(2026-10-24):拆为 state/helpers/telemetry/structured/executors + 可写导出门面;**RF-1 整项完成(8/8)**。核心教训:门面不得用 `export *`(getter 不可写,测试就地桩失效),记 wiki。
28. ~~**LOOP-28 BUG-9 注册键对齐**~~ ✅ 完成(2026-10-25):全量扫描发现并修复 8 处注册键与资产版本不一致,`prompting.test.js` 恢复 49/49 全绿;新发现 BUG-10。
29. ~~**LOOP-29 BUG-10 comic 内联提示词迁移**~~ ✅ 完成(2026-10-25):`factExtractionPrompt` 迁入 prompting 并注册,governance integration 恢复全绿。
30. ~~**LOOP-30 BUG-3 + BUG-4 小项清理**~~ ✅ 完成(2026-10-25):pnpm WARN 消失;移动端外观页专属落点齐全,238/238 + 1448/0 全绿。
31. ~~**LOOP-31 BUG-6 + BUG-8**~~ ✅ 完成(2026-10-25):拆书步骤词表补齐全阶段;任务中心隐藏行与 overview 计数同源;守卫 6 条,全量 1453/0。
32. ~~**LOOP-32 BUG-5 任务阶段词表中英混写收敛**~~ ✅ 完成(2026-10-25):resolveStageIndex 兼容 key/label,写入点统一中文标签,守卫 4 条,全量 1457/0。
33. ~~**LOOP-33 UI-1 第三批 B:设置页语义 token 收敛**~~ ✅ 完成(2026-10-25):设置模块 15 处硬编码色迁移,0 残留,守卫 1 条,client 239/239。
34. ~~**LOOP-34 UI-1 第三批 C:世界样本卡状态与下一步引导**~~ ✅ 完成(2026-10-25):resolveWorldGuidance 纯函数 + 卡片引导区,守卫 5 条,client 244/244。
35. ~~**LOOP-35 UI-1 第三批 D:模型路由按任务分组**~~ ✅ 完成(2026-10-25):分组纯函数 + renderRouteCard 分组渲染,守卫 5 条,client 249/249。
36. ~~**LOOP-36 UI-1 第三批结构验收与计划纠偏**~~ ✅ 完成(2026-10-25):验收 generator/anti-ai-rules 已达目标(守卫 2 条),纠偏 rollout 计划;唯一剩余 style-engine 结构终态。
37. ~~**LOOP-37 UI-1 `/style-engine` 结构终态**~~ ✅ 完成(2026-10-25):三套工作面板从 88vh/84vh 弹窗改为页面内常驻工作区,守卫 3 条,client 254/254;**UI-1 第三批全部完成**。
38. ~~**LOOP-38 UI-1 第四批:短剧/漫画状态色语义化**~~ ✅ 完成(2026-10-25):13 处状态色迁移,结构项审计已达目标,守卫 2 条,client 256/256;分类色设计张力登记为 UI-6。
39. ~~**LOOP-39 UI-1 第五批:帮助页主题化**~~ ✅ 完成(2026-10-25):/help 结构审计已达标,Hero 主题化 + 语义状态色,守卫 3 条,client 259/259。
40. ~~**LOOP-40 UI-1 第五批:预览页阅读进度与编辑器推荐**~~ ✅ 完成(2026-10-25):previewReading 纯函数 + 进度条 + 推荐按钮,守卫 4 条,client 263/263。
41. **所有者指示(2026-10-20):此后按 BACKLOG 顺序执行** → 下一项 **UI-1 第五批剩余**(story-modes 资产库化 / 章节编辑器收敛)或 **UI-5 开源 Showcase**;**UI-6 分类色** 与 **BUG-7** 仍需所有者/设计决策。
    **完成项打勾规则(2026-10-20 所有者要求)**:每轮收尾同步更新 BACKLOG —— 完成项 `[x]` + ✅,进行中 `[/]`,入口建议划线。

---

## 1. 残缺功能收束(FEAT)

- [x] **FEAT-1 漫画工作台降级为实验特性** · S · P1(= LOOP-3,2026-10-17 完成) ✅
  结果:桌面侧边栏"实验"徽标 + 注册表过滤;设置→外观与主题总开关可隐藏入口(路由始终可直达);public 文档与 wiki 标注实验状态;`client/src/config/experimentalFeatures.ts` 注册表 + 测试。
  验收:主链 UI 不受干扰(三套验证绿);开关可关闭;既有功能未回退。

- [x] **FEAT-2 短剧工作台降级为实验特性** · S · P1(= LOOP-3) ✅
  结果:同 FEAT-1;桌面入口从 disabled 改为可用并与移动端一致;两页顶部模拟成片提示条(「默认使用模拟演示通道,未接入真实视频生成服务时不会产出真实视频」,配置真实通道的部署下仍准确)。
  验收:同 FEAT-1 + 用户不会误以为能直接出片。

- [~] **FEAT-3 短剧真实视频 provider 接入** · M · P3(冻结)
  架构已预留 `VideoProviderPort`;等 FEAT-2 完成且主链稳定后再评估。

- [~] **FEAT-4 漫画分镜连贯与成片导出完善** · M · P3(冻结)。

## 2. 创新点提案池(INN)

> 四条线:A 写作质量与长篇记忆 · B Agent 架构工程 · C 交互与可视化 · D 成本与效率。
> 每项都是提案,排期前需所有者拍板;落地一律先 MVP。

### A · 写作质量与长篇记忆

- [x] **INN-A1 伏笔/承诺账本(Foreshadowing Ledger)** · M · P1(= LOOP-5,2026-10-18 完成) ✅
  结果:先审计(上游已有双 AI 写路径 + 注入 + 只读卡片,验收②已达成),再收敛 11 项:手动登记/标记 + manualLocked 锁定语义、入口门控修复、过窗读时升格、停滞扫描(30 章)、回收计数、逾期降质量债、导演/大纲提醒面。契约见 `docs/wiki/architecture/payoff-ledger-lifecycle.md`;计划 `docs/plans/payoff-ledger-mvp.md`;守卫 `server/tests/payoffLedgerMvp.test.js`。
  残留调优 → INN-A1b。

- [ ] **INN-A1b 伏笔账本注入调优与体验打磨** · S–M · P3(LOOP-5 后置项合并登记)
  清单(A1-G2/G3/G5/G6/G7 注入保底与排序:payoff_ledger 块进 preferredGroups、riskSignals/confidence 透传、overdue 注入升级 payoff 语义、pending 按窗口排序、注入条数上限与截断顺序;G8/G9 上下文遥测与预算档案对齐;G11-UI 窗口行内编辑;G15 卡片筛选与章节跳转;G18 同步状态标记与手动重建入口;G19 验收 requiresFullPayoffReconcile 死字段接线;G23 sync_stale 进合成问题;G24 快照双轨说明强化;G25 Markdown 导出伏笔清单;planner 空账本回退摘要 paidOff/failed 仍为 0)。
  验收:逐项小步推进,每批保持三套测试绿;完成项从清单划除。

- [x] **INN-A2 全书一致性守卫(Continuity Guard)** · M · P2(= LOOP-7,2026-10-20 完成) ✅
  结果:审校 prompt v3 内置三类矛盾检查协议 + 专用问题码(时间线/动机/世界规则)与取证要求;`services/audit/continuityGuard.ts` 确定性规范化(去重保最严、排序、限量、丢空证据)接入既有治理链,零新增 LLM 调用与执行器分支;链路守卫测试覆盖 high→blocking、medium→质量债。契约见 wiki `novel-generation-quality-guards.md` 第八节;计划 `docs/plans/continuity-guard.md`。
  残留:真实检出质量依赖模型按协议输出(失效模式已记 wiki);跨章批量回溯重扫未做。

- [x] **INN-A3 分层递归记忆(章 → 卷 → 全书摘要树)** · M · P2(= LOOP-8,2026-10-20 完成) ✅
  结果:contextPackage/writeContext 新增 `volumeRecap`(卷内已写章节回顾,当前章前 ≤8 条)与 `bookStateSnapshot`(canonical 时间线已发生事件按章序 ≤8 条);纯函数模块 `layeredMemoryContext.ts` + 装配器单点装配 + writer 两块(priority 91/89)+ 资产 requirements/preferredGroups 登记 + provider contract 遥测(>3 章评估、degrade);5 条守卫测试。契约见 `docs/wiki/rag/knowledge-and-context-assembly.md`;计划 `docs/plans/layered-memory.md`。
  遗留:review/repair 模式未注入(按 MVP 先保 writer);"抽样对比漂移减少"待所有者实测。

- [x] **INN-A4 角色弧线追踪** · M · P3(= LOOP-9,2026-10-20 完成) ✅
  结果:CharacterTimeline 演变流水接入生成上下文 —— `character_arc` 块(每名参与者近 3 条演变轨迹)+ 装配注入 + writer 登记 + 遥测,与 local_state/dynamics 互补构成"角色当前阶段状态"。计划 `docs/plans/character-arc-tracking.md`;契约见 rag wiki 分层记忆段。
  遗留:evolveCharacter 自动触发(新 LLM 调用与配额决策)与漂移实测留后续。

### B · Agent 架构工程

- [x] **INN-B2 统一任务投影契约** · M · P0(= LOOP-4,2026-10-17 完成) ✅
  结果:契约审计(17 项发现,对抗核实 7 confirmed / 2 refuted)→ 收敛落地 8 项(pmr 全 kind 投影、读路径去 heal、步骤区 pmr 中性、displayStatus 中文化、sourceRoute 单一构造器、attentionCount 权威计数、cancelled 全链中性、小说页映射守卫)+ 六条三层守卫测试。持久契约见 `docs/wiki/architecture/task-projection-contract.md`;计划与处置表见 `docs/plans/task-projection-contract.md`。
  残留:阶段词表/拆书步骤/入队清 pmr/混合视图计数 → BUG-5..8。

- [x] **INN-B1 全链路 Trace 与决策回放** · M · P2(= LOOP-10,2026-10-20 完成) ✅
  结果:新增 `ChapterGenerationTrace`(双迁移)定稿即快照四段轨迹(上下文 gating+压缩日志 / 模型参数 / 审核码 / 验收与重规划决策),只读入口 `GET /api/chapter-traces/:novelId/:chapterId`;压缩日志从 console.debug 升级为随包持久化;写入失败不影响主链。计划 `docs/plans/chapter-generation-trace.md`;契约见 rag wiki。发布说明:内部能力,显式跳过。
  遗留:检索 trace 关联(需 RagRetrievalTrace 加 chapterId)与前端回放 UI 后置。

- [x] **INN-B3 成本感知模型路由** · M · P2(= LOOP-11,2026-10-20 完成) ✅
  结果:按任务类型路由(既有 ModelRouteConfig)+ 按书计量流水(`LlmUsageEvent` 双迁移)+ 价格配置(`llm.model_prices` 与设置端点)+ 成本对比报告(当前路由 vs 最便宜/最贵模型 + 节省额 + 未定价清单,`GET /api/cost-report/:novelId`)。计划 `docs/plans/cost-aware-model-routing.md`;契约见 model-selection wiki。发布说明:内部能力,显式跳过。
  遗留:自动按成本切换路由(策略化)与前端成本展示留后续;与 INN-D1 报表联动后置。

- [x] **INN-B4 失败模式 → 恢复动作知识库** · S–M · P3(= LOOP-12,2026-10-20 完成) ✅
  结果:`recoveryPlaybook` 注册表 20 条目覆盖全部既有 failureCode/noticeCode/failureClassification 码 + 人工恢复合成条目 + 兜底;解析优先级(人工恢复最高)> failureCode > noticeCode > classification;`TaskCenterService.getTaskDetail` 统一附加 `recoveryGuidance`;只读目录 `GET /api/recovery-playbook`。契约见 wiki `workflows/recovery-playbook.md`;计划 `docs/plans/recovery-playbook.md`。发布说明:内部字段,显式跳过。
  遗留:前端展示与可执行恢复动作(仍在源页面/跟进)后置。

### C · 交互与可视化

- [x] **INN-C1 故事世界图谱可视化** · M–L · P2(= LOOP-13/14,2026-10-21 完成) ✅
  结果:两轮交付 —— ①小说级图谱投影(角色×势力×地点,切片/关系阶段/势力轨迹确定性合成,截断统计与回退)+ 只读端点 `GET /api/story-graph/:novelId`;②前端页面 `/novels/:id/story-graph`(路由级 + 画布二次懒加载,React Flow 同心环布局、拖动与节点摘要,入口在角色「关系」页签,移动端合同齐全)。契约见 wiki `workflows/story-world-graph.md`;计划 `docs/plans/story-world-graph.md`。
  残留:图谱内编辑动作与时间线/地理子视图属后续可视化轮次(UI-3 队列)。

- [x] **INN-C2 生产看板** · M · P3(= LOOP-15,2026-10-21 完成) ✅
  结果:纯聚合模型 + 看板页 `/novels/:id/production-board` —— 状态分布(8 态含零项)、待处理章节(error → replan_required → quality_debt)、质量债务热点(前 5)、卷进度(章序映射 + 未挂卷计数);数据源复用 `simple-shelf` + `volumes` 既有投影,零新增后端契约;入口在小说工作区「项目工具」,移动端合同齐全。计划 `docs/plans/production-board.md`;守卫 `client/tests/productionBoard.test.js`。
  验收:章节状态、债务热点、卷进度一屏总览,条目直达章节页。

- [x] **INN-C3 变更 diff 预览** · S–M · P3(= LOOP-16,2026-10-21 完成) ✅
  结果:纯 diff 模型 `volumeWorkspaceDiff.ts` + 保存门禁 `requestPlanSave` + 确认弹窗 —— 卷战略与节奏/拆章保存前先列出新增/移除/移动/修改的卷与章节,无基线或无改动直接保存;节奏拆章如实说明同步语义(已有正文保留、卷纲外章节不自动删除);章节 AI 改写候选 diff 与版本历史 diff 保持原能力。契约见 wiki `workflows/planning-change-preview.md`;计划 `docs/plans/planning-change-preview.md`;守卫 `client/tests/planningChangePreview.test.js`。
  验收:规划修改先预览再落盘;章节修改既有 diff 预览不回归。

### D · 成本与效率

- [x] **INN-D1 全链路 token 预算与成本报表** · M · P2(= LOOP-17,2026-10-22 完成) ✅
  结果:本书 token 预算(`AppSetting.llm.production_token_budget`,本书覆盖 > 全局默认)+ 累计用量(`LlmUsageEvent` 求和)+ 章节边界熔断(reason `token_budget_exceeded` → 问题码 `runtime.token_budget_exceeded`、可恢复暂停)+ 独立预算端点 `GET/PUT /api/production-budget/:novelId`;生产看板新增「AI 成本与预算」面板(近 30 天费用对比 + 任务前列 + 累计用量 + 预算维护);成本报告端点保持只读。计划 `docs/plans/production-token-budget.md`;契约见 wiki `architecture/model-selection.md`;守卫 `server/tests/productionTokenBudget.test.js`、`client/tests/productionCostPanel.test.js`。
  验收:拆书预算守卫扩展到生产链且可恢复;每本书可在看板查看成本报表并设置预算。

- [x] **INN-D2 本地模型(Ollama 兼容)接入** · M · P3(= LOOP-18,2026-10-23 完成) ✅
  结果:审计确认 Ollama 兼容层主体已存在(免密钥内置厂商、`/api/tags` 模型目录、`prompt_json` 结构化输出、RAG 嵌入候选);补齐最后一公里 —— 模型路由页「本机跑审校与摘要」一键预设(仅 review/light_review/critical_review/summary,温度 0.3,填草稿后确认保存)+ 免密钥厂商文案 + 修复本机 Qwen 模型被误判为自定义网关的分类缺陷。计划 `docs/plans/local-model-offline.md`;契约见 wiki `architecture/model-selection.md`;守卫 `server/tests/ollamaOfflinePath.test.js`、`client/tests/localModelOffline.test.js`。
  验收:审核/摘要四类任务可一键切到本机模型并离线运行;正文生成等任务不受预设影响。

- [x] **INN-D3 批量生成吞吐优化** · M · P3(= LOOP-19,2026-10-23 完成) ✅
  结果:审计确认章节生产链/节奏段章节列表必须串行(前序依赖),拆书角色与导演候选已并行;唯一安全缺口 = 角色外显资料批量生成逐角色串行。改为 `runCharacterVisibleProfileBatch` 有界并发(默认 3),slot 回填保证结果与跳过项按输入顺序返回,单项失败隔离,provider requestLimiter 仍然生效。契约见 wiki `workflows/batch-generation-throughput.md`;计划 `docs/plans/batch-throughput.md`;守卫 `server/tests/characterVisibleProfileBatch.test.js`。
  验收:独立批量任务并发吞吐提升,顺序与失败语义不变;章节链保持串行。

## 3. 重构与解耦(RF)

- [x] **RF-1 大文件拆分(逐个成轮,行为不变)** · 每个 S–M · P2(= LOOP-20~27,2026-10-24 整项完成) ✅
  结果:8 个 >1000 行文件全部拆为职责子模块并保留兼容门面,行为不变、全量通过:`worldStructure.ts`(1311 → 门面)、`worldVisualization.ts`(1082 → 门面)、`world.prompts.ts`(1312 → 门面,14 个 PromptAsset 按族拆分)、`ChapterArtifactDeltaService.ts`(1302 → 957,拆出 shared 工具与伏笔消费者)、`comicRoutes.ts`(1071 → 23 行入口,8 个领域注册器,同轮达成 RF-2)、`novelDirectorTakeover.ts`(1158 → 3 行门面,7 个子模块)、`RagIndexService.ts`(1242 → 768,拆出纯分块/源加载/嵌入批处理)、`promptRunner.ts`(1264 → 可写导出门面 + 5 个子模块)。
  核心教训:promptRunner 门面必须用显式 `export const` 而非 `export *`(getter 不可写会让测试就地桩静默失效),已记 wiki `prompts/prompt-runner-module.md`。各轮计划见 `docs/plans/rf1-*.md`,模块边界 wiki 见 architecture/rag/prompts 对应页。

- [x] **RF-2 comicRoutes HTTP 层拆分** · S · P2(= LOOP-24,2026-10-24 完成) ✅
  结果:与 RF-1 第五轮合并执行 —— 拆为 8 个领域注册器 + `comicRouteSchemas`/`comicRouteContext` + 23 行入口;64 条路由与注册顺序不变,全量测试通过。计划 `docs/plans/rf1-comic-routes-split.md`;契约见 wiki `architecture/comic-http-module.md`。

- [ ] **RF-3 密钥存储加固** · M · P1
  `DatabaseSecretStore` 明文存 API key;改为加密存储,处理旧数据迁移与桌面版兼容。
  验收:db 中不再见明文 key;旧库自动迁移;桌面版回归通过。
  (同时服务自用安全与开源就绪。)

- [ ] **RF-4 文档一致性清理** · S · P3
  `docs/` 与代码引用对齐(仓库已有清理先例);体检轮若发现过时引用可顺带登记。

- [ ] **RF-5 prompting → services 依赖面收敛** · S · P3
  LOOP-2 已断开 `creativeHubContextResolvers` 一条循环边(改调用时惰性加载);同类顶层 import 未全面排查。
  顺带:`services/rag/index.js` 模块加载即实例化全部单例,加剧冷加载循环脆弱性,可评估惰性 getter 化。
  验收:冷启动 `node -e "require('./dist/app.js')"` 类路径无 "is not a constructor";新增守卫测试可选。

## 4. 缺陷与稳定性(BUG)

- [x] **BUG-0 项目体检与缺陷清单**(= LOOP-1) · S · P0 ✅
  已产出:测试基线见 BUG-1/BUG-2/BUG-3;冒烟结论与全部证据见 PROGRESS LOOP-1 条目(2026-10-16)。

- [x] **BUG-1 server fast 套件 33 个失败** · M–L · P0(= LOOP-2,2026-10-16 完成) ✅
  结果:**1383 测试 / 1371 过 / 0 失败 / 12 跳过**,fast 模式改为进程隔离(根治跨文件污染)。
  分诊结论:3 个**真 bug** —— ①token 预算并发丢更新(bookAnalysis.budget 用 read-modify-write 替代原子 increment,批量拆书低估消耗);②章节资源提取上限在 artifact delta schema 缺失(仅靠 prompt 约束);③agent 工具 zod 类型声明未下沉 schema 模块。
  另修 3 处架构脆弱点 —— ④`NovelDirectorIdeaInspirationService` 归位 `idea/`(满足导演根目录边界守卫);⑤提示词上下文解析器 → 服务层顶层 import 形成循环依赖(冷加载"is not a constructor"),改调用时惰性加载;⑥fast 测试单进程 require 全部文件造成跨文件污染(drama 假 prisma 进 require.cache 不还原等),改为 `node --test` 进程隔离。
  其余 ~22 个文件为**测试陈旧**(代码有意演进未同步测试),断言/mock 对齐现行契约,细节见 PROGRESS LOOP-2。

- [x] **BUG-2 client 套件 5 个失败** · S · P1(= LOOP-2) ✅
  结果:client **92/92 全绿** + typecheck 绿。(口径修正:全量实为 215,92 为 `tests/*.test.js` 部分口径;`.mjs` 子集未计入导致一个陈旧断言漏网,已于 LOOP-3 修复并写进 PROGRESS。) 
  ①移动端合同簇 ×4:新页面(market-radar、settings-model-routes)的 CSS 落点缺失 ×5 个选择器已补;导航测试列表对齐 31 条现行元数据;任务筛选面板恢复"两行三列"移动合同(kind,status,异常 / keyword 跨列,排序)—— 显式栅格定位 + md 释放 + xl order-last 保桌面模板,激活态改 data 属性驱动(静态类名守卫可继续生效)。
  ②设置路由契约:`/settings/model-routes` 已是独立页(非重定向),旧链接兼容性保持,测试更新。

- [x] **BUG-3 pnpm 配置迁移卫生** · S · P3(= LOOP-30,2026-10-25 完成) ✅
  结果:`pnpm-workspace.yaml` 的 `allowBuilds` 已覆盖原配置语义(两处清单等同),直接删除根 `package.json` 的 `pnpm` 块;所有 pnpm 命令不再打印 WARN;server/client 全量验证通过。

- [x] **BUG-4 移动端路由元数据缺 /settings/appearance 登记** · S · P3(= LOOP-30,2026-10-25 完成) ✅
  结果:`MOBILE_ROUTE_PATTERNS` 补登记 `settings-appearance`(外观与主题,more 组),`index.css` 两块补 `.mobile-route-settings-appearance`,导航测试 `routedPaths` 补 `/settings/appearance`;移动端该页使用专属布局与标题。client 238/238。

- [x] **BUG-5 任务阶段词表中英分裂** · M · P2(= LOOP-32,2026-10-25 完成) ✅
  结果:`resolveStageIndex` 先按 key 再按 label 解析,存量中英混写数据均命中正确步骤索引;唯一英文 key 写入点(`DirectorProductionExperienceService`)改用 `NOVEL_WORKFLOW_STAGE_LABELS.chapter_execution`,写入侧全部统一中文标签;守卫 `workflowStageVocabulary.test.js`(4 条:key/label 命中、未知回落、写入点静态扫描)。

- [x] **BUG-6 拆书任务步骤词表缺口** · S · P2(= LOOP-31,2026-10-25 完成) ✅
  结果:`BOOK_ANALYSIS_STEPS` 补齐 `loading_cache`/`generating_overview`,步骤流与 `BookAnalysisStage` 全集一致,中段进度不再回落第 0 步;产品语义核实:draft 在拆书专属页面可见,archived 为显式归档全站隐藏 —— 均有明确语义,无需改。守卫 `bookAnalysisSteps.test.js`(2 条:词表覆盖 + 索引正确)。

- [ ] **BUG-7 命令入队无条件清除待手动恢复标记** · S · P1(LOOP-4 审计 INC-3,partly;**需所有者产品语义决策**)
  `DirectorCommandService.markCommandAcceptedOnTask` 在任何导演命令入队时把 `pendingManualRecovery` 清回 false 并置 queued;agent 工具 enqueueContinueCommand 属可达路径。与"仅显式用户恢复可清除 pmr"的 AGENTS 契约存在张力。
  待决策:哪些入队路径可视作"显式恢复"(用户 UI 动作 / 用户批准的 agent 运行 / 后台自动)?决策后加守卫并在非豁免路径保留 pmr。
  验收:决策落地 + 守卫测试锁定允许清除的路径清单。

- [x] **BUG-8 混合视图隐藏行与 overview 计数不对齐** · S · P3(= LOOP-31,2026-10-25 完成) ✅
  结果:`parseLinkedPipelineJobId` 移入 `taskCenterVisibility` 单一来源;新增 `collectLinkedPipelineJobIdsFromRows` 供 overview 复用同一代理状态规则;`listTasks` 移除 kind=novel_pipeline 隐藏旁路;overview 的 pipeline 计数排除被代理行。切换筛选不再"凭空出现/消失"。守卫 4 条(含静态断言)。

- [x] **BUG-9 prompt 注册表注册键与资产版本不一致** · S · P3(= LOOP-28,2026-10-25 完成) ✅
  结果:全量扫描 161 个注册键发现 8 处落后于资产实际版本(castOptions/chapterHook.generate/castAuto/castAuto.members/supplemental/resource_recommendation/style.detection/style.rewrite/world.generate_from_theme),全部对齐;`prompting.test.js` 恢复 **49/49**;扫描脚本零不一致。教训记 wiki `prompts/prompt-runner-module.md`。
  残留发现:governance integration 违规 `ComicFactService.ts:39` 内联 SystemMessage → BUG-10。

- [x] **BUG-10 comic 事实提取提示词内联在服务文件(违反 prompt 治理)** · S · P3(= LOOP-29,2026-10-25 完成) ✅
  结果:`factExtractionPrompt` 迁入 `prompting/prompts/comic/comic.prompts.ts` 并注册 `comic.factExtraction@v1`;`ComicFactService` 改为从 prompting 导入资产,服务逻辑不变;governance integration 模式恢复全绿。事故记录:迁移中曾误覆盖既有 `comic.prompts.ts`(上游已完成 episodeOutline/panelScript 迁移),已 git checkout 恢复并改为追加合并,162 注册键全量校验一致。
  验收:`prompting-governance` + `comicDecoupling` + `prompting.test` + `promptCatalog` 全绿;全量 0 失败。

## 5. 前端 UI 改进(UI)

> 挂靠三份既有决策,不另起炉灶:设计规范 `docs/design/product-ui-design-system.md`、
> 分批落地计划 `docs/plans/product-ui-design-rollout-plan.md`、可视化栈 `docs/design/visualization-stack.md`。
> 既有规则继续有效:低边框视觉规范、项目自有组件、**不新增 shadcn 组件**、不加装饰渐变、硬编码色值只减不增。

- [/] **UI-1 落实既有设计系统剩余批次** · M · P1(进行中)
  **基线复核(2026-10-20)**:rollout 计划记载的第一批/第二批(2026-07-14)经代码验证属实(语义 token 存在、`components/assetLibrary/` 共享组件被知识库/题材/基础角色三页引用),原描述已过时。
  **本轮完成(第三批 A,LOOP-6)**:写法引擎视觉收敛 —— `writingFormula` 模块 ~300 处调色板硬编码色全部迁移到语义 token,删除 `index.css` 的 `.writing-formula-theme` 暗色 hack 块与 4 处装饰渐变,创建弹窗收敛为常规尺寸;守卫测试 `client/tests/styleEngineVisualContracts.test.js`。
  **第三批 B(LOOP-33)**:设置模块 ~15 处硬编码色(emerald/amber/sky/red/slate)全部迁移到语义 token(success/warning/info/destructive/muted),0 残留;守卫 `client/tests/settingsVisualContracts.test.js`。
  **第三批 C(LOOP-34)**:世界样本库卡片接入 `resolveWorldGuidance` 纯函数,显示状态/可支撑步骤/下一步;守卫 `client/tests/worldGuidance.test.js`。
  **第三批 D(LOOP-35)**:模型路由页按 开书设定/规划推进/正文生产/审校把关/资料加工/灵感对话 分组渲染;守卫 `client/tests/modelRouteGroups.test.js`。
  **结构验收(LOOP-36)**:generator 已是四步工作区、anti-ai-rules 已是两栏结构(上游已达目标),守卫 `worldGenAndAntiAiStructure.test.js` 锁定,计划状态纠偏。
  **第三批 E(LOOP-37,第三批收官)**:`/style-engine` 编辑/应用测试/去 AI 味三态从 88vh/84vh 弹窗改为页面内常驻工作区,创建流程保留模态,焦点契约不变;守卫 `styleEngineWorkspaceStructure.test.js`。**第三批全部完成**。
  **第三批剩余**:
  - 世界三页(`/worlds`、`/worlds/generator`、`/worlds/:id/workspace`):状态/推荐深化动作与分步工作区的结构对齐(色值仅 1 处,几乎干净);
  - 设置(`/settings/model-routes` 组织 + 设置内部 17 处色值);
  - `/style-engine` 嵌套 Card 收整与「资产库 + 编辑工作区」结构终态(本轮仅做色值与弹窗,结构留后续);
  - `/anti-ai-rules` 结构对齐(色值已 0)。
  **之后**:第四批(短剧/漫画衍生页)、第五批(阅读/帮助/兼容页)、第六批(全站一致性验收)。
  验收:以 rollout 计划各批验收条款为准(语义 token、无硬编码色、client typecheck、响应式无横向滚动);不新增后端 API/字段/路由。

- [ ] **UI-2 视觉富化:主题与氛围层** · M · P2
  在低边框规范之上做"加法"而非堆装饰:明暗双主题切换(基于语义 token)、微交互与过渡(生产链进度、状态变化、卡片 hover 层级)、Loading/Empty 的插画化与品牌感、正文阅读氛围(章节页排印密度)。
  验收:核心页明暗两套走查通过;所有动效可被 `prefers-reduced-motion` 关闭;typecheck 通过;截图记入 PROGRESS。

- [ ] **UI-3 可视化富化(按可视化栈定盘落地)** · M–L · P2
  栈已定盘(React Flow + d3 数学 + Recharts,全部懒加载零首屏增量),候选面按该文档优先级:
  ① `WorldVisualizationBoard`(836 行手写)迁 React Flow + d3-force;
  ② 角色关系网与势力图谱(React Flow 节点图);
  ③ 故事时间线(`shared/types/timeline.ts` 类型已就绪);
  ④ 自动导演工作流步骤图(step catalog 已有编排元数据);
  ⑤ 紧张度曲线重构(已上线的手写 SVG 按栈纪律重做);
  ⑥ 统计面板(质量分布/字数/RAG 追踪 → Recharts)。
  依赖纪律:**不新引入任何可视化依赖**(栈内依赖 2026-07 已一次定盘);渲染归 React,D3 只做纯计算。
  验收:对应页面有可交互可视化;懒加载 chunk 独立;首屏 bundle 无增量。

- [ ] **UI-4 编辑器与阅读体验富化** · M · P3
  正文预览/阅读视图排印(字号、行距、章节目录导航、专注模式)、章节版本对比阅读。守 Editor 合同:正文占视觉中心,诊断与建议入侧栏。

- [ ] **UI-5 开源 Showcase 就绪** · S–M · P2
  首页/项目概览成为"可截图的一页 demo":当前创作状态、主链亮点、下一步动作一屏;服务"个人开源作品"定位,与公开介绍站(`site/`)表述一致。
  验收:新访客 30 秒内理解"这是什么、怎么开始";与 `site/` 无表述冲突。

- [ ] **UI-6 分类 chip 色彩体系决策** · S · P2(LOOP-38 审计发现,**需所有者/设计决策**)
  短剧/漫画的分类 chip(资产类型 costume/vehicle、事实类别 completed/revealed、性别、密度)用 sky/violet/amber/emerald 区分多个类别。语义 token 只有 success/destructive/warning/info/muted,折叠会丢失类别区分度。
  待决策:① 为"分类色"新增一组受控 token(如 category-1..N);② 保留多色但纳入设计规范并允许;③ 改用"单色 + 图标/文字前缀"区分。
  验收:决策落地 + 分类 chip 守卫测试锁定,状态色守卫保持通过。

## 6. 开源就绪与运营(OPS)

- [ ] **OPS-1 仓库转公开前历史清理** · S · P0(转公开硬前置)
  删 `refs/remotes/upstream/*` + `git gc --prune=now`,复检历史无旧 key;遵守红线(绝不 push --all/--mirror)。
- [ ] **OPS-2 品牌与命名定稿** · S · P2
  是否改项目名、README/介绍站/包名统一表述;由所有者拍板。
- [ ] **OPS-3 LICENSE / NOTICE / CLA 归属梳理** · S · P2。
- [ ] **OPS-4 对外文档审校** · S · P3。
