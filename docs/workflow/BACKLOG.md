# 改进待办池 · Backlog

更新:2026-10-16
配套流程:[improvement-workflow.md](improvement-workflow.md) · 进度:[PROGRESS.md](PROGRESS.md)

状态标记:`[ ]` 待做 · `[/]` 进行中 · `[x]` 完成 · `[~]` 冻结/搁置 · `[!]` 降级为实验
ID 规则:`FEAT` 残缺功能收束 · `INN` 创新 · `RF` 重构 · `UI` 前端体验 · `BUG` 缺陷 · `OPS` 开源就绪
规模标记:S(≤1 轮)· M(1–3 轮)· L(多轮,需拆分)

## 轮次入口建议(2026-10-15)

1. ~~**LOOP-1 项目体检基线**(BUG-0)~~ ✅ 已完成(2026-10-16):基线 = server 33 失败 / client 5 失败 / typecheck 绿 / 冒烟 7 页 0 报错。
2. **LOOP-2 套件绿化**(BUG-1/2):分诊并修掉 38 个失败测试 —— 基线不绿会让之后每轮验证失真,优先级最高。
3. **LOOP-3 衍生工坊实验化**(FEAT-1/2):漫画/短剧降级,收束创作入口复杂度。
4. **LOOP-4 统一任务投影契约**(INN-B2):修"后端状态 / 运行记录 / 前端展示三者不一致"这个自用最疼的点。
5. **LOOP-5 伏笔账本 MVP**(INN-A1):创新第一弹,写作质量方向。
6. **UI 线并行入口**(UI-1 第一批):纯前端、验收明确、风险低,适合穿插在创作线轮次之间,不与主链轮次抢验证资源。
7. 之后按 P 标记 + 体检结果 + 所有者兴趣排。

---

## 1. 残缺功能收束(FEAT)

- [ ] **FEAT-1 漫画工作台降级为实验特性** · S · P1
  现状:约 3900 行服务(comic + adaptation 防腐层)+ 1071 行路由 + 完整前端;图像生成已接真实 provider。属衍生工坊,优先级低于小说主链。
  做法:入口标注"实验"并可隐藏(设置开关或默认折叠);`docs/public` 对应文档标注实验状态。
  验收:主链 UI 不被干扰;开关可关闭;既有功能不回退。

- [ ] **FEAT-2 短剧工作台降级为实验特性** · S · P1
  现状:约 5600 行,架构干净(SourceBundle 防腐层 + 质量闸 + 节奏引擎 + TTS 配音),但视频生成 provider 仍是 mock。
  做法:同 FEAT-1;UI 明示"未接入真实视频生成"。
  验收:同 FEAT-1 + 用户不会误以为能直接出片。

- [~] **FEAT-3 短剧真实视频 provider 接入** · M · P3(冻结)
  架构已预留 `VideoProviderPort`;等 FEAT-2 完成且主链稳定后再评估。

- [~] **FEAT-4 漫画分镜连贯与成片导出完善** · M · P3(冻结)。

## 2. 创新点提案池(INN)

> 四条线:A 写作质量与长篇记忆 · B Agent 架构工程 · C 交互与可视化 · D 成本与效率。
> 每项都是提案,排期前需所有者拍板;落地一律先 MVP。

### A · 写作质量与长篇记忆

- [ ] **INN-A1 伏笔/承诺账本(Foreshadowing Ledger)** · M · P1
  把伏笔做成一等创作资产:埋设 → 提醒 → 回收/遗忘的生命周期,与现有角色资源账本同构(可复用其审计/提案/待确认模式)。章节生成上下文注入"本章待回收伏笔",回收率进质量闸。
  验收:能登记伏笔;生成时被引用;回收状态可视化;长期未回收伏笔有提醒。
  MVP 范围:登记 + 上下文注入 + 回收标记,可视化后置。

- [ ] **INN-A2 全书一致性守卫(Continuity Guard)** · M · P2
  章节生成后结构化校验:时间线矛盾、角色动机违背、世界规则冲突;输出接入问题治理链(复用统一治理动作,不在执行器新增分支)。
  验收:构造矛盾场景能检出并产出治理动作。

- [ ] **INN-A3 分层递归记忆(章 → 卷 → 全书摘要树)** · M · P2
  落地 roadmap"长程上下文记忆":卷摘要 + 全书状态快照(时间线、角色状态、伏笔面)稳定参与后段生成。
  验收:长篇后段生成的上下文含分层摘要;抽样对比后段设定漂移减少。

- [ ] **INN-A4 角色弧线追踪** · M · P3
  拆书已有"角色形象演变";扩展到性格/目标/关系演变,生成时注入角色当前阶段状态。

### B · Agent 架构工程

- [ ] **INN-B2 统一任务投影契约** · M · P0(roadmap 开发重点 #3)
  消除后端实际状态 / 运行记录 / 前端展示三者不一致;先做契约审计(三处字段对照表),再收敛实现,补守卫测试。
  验收:任一长链任务状态在三处可对照;不一致会被守卫测试拦下。

- [ ] **INN-B1 全链路 Trace 与决策回放** · M · P2
  把 retrieval trace 扩展为生成链 trace:每章的上下文装配、模型选择、审核决策可回放。既是排障工具,也是作品集展示点(可解释 Agent)。
  验收:任一已生成章节能查到"为什么这么写"的结构化轨迹。

- [ ] **INN-B3 成本感知模型路由** · M · P2
  便宜模型跑规划/摘要/审核,强模型跑正文;配额感知;按任务类型可配策略。
  验收:同一本书两种路由的成本对比可见(配合 INN-D1)。

- [ ] **INN-B4 失败模式 → 恢复动作知识库** · S–M · P3
  把常见暂停/失败原因沉淀为结构化"原因 → 恢复动作",自动导演恢复更聪明。

### C · 交互与可视化

- [ ] **INN-C1 故事世界图谱可视化** · M–L · P2
  世界结构数据已有(势力/角色/地图),做成可交互图谱;与 INN-A4 共用可视化基座。

- [ ] **INN-C2 生产看板** · M · P3
  章节状态、质量债务热点、卷进度一屏总览。

- [ ] **INN-C3 变更 diff 预览** · S–M · P3
  规划/章节修改先预览 diff 再落盘。

### D · 成本与效率

- [ ] **INN-D1 全链路 token 预算与成本报表** · M · P2
  拆书已有 token 预算守卫,扩展到生产链;每本书出成本报表。

- [ ] **INN-D2 本地模型(Ollama 兼容)接入** · M · P3
  自定义 provider 已有基础;补 Ollama 兼容层,审核/摘要可离线跑。

- [ ] **INN-D3 批量生成吞吐优化** · M · P3。

## 3. 重构与解耦(RF)

- [ ] **RF-1 大文件拆分(逐个成轮,行为不变)** · 每个 S–M · P2
  清单(>1000 行):`world.prompts.ts`(1312)、`worldStructure.ts`(1311)、`ChapterArtifactDeltaService.ts`(1292)、`promptRunner.ts`(1264)、`RagIndexService.ts`(1242)、`novelDirectorTakeover.ts`(1158)、`worldVisualization.ts`(1082)、`comicRoutes.ts`(1071)。
  要求:一次拆一个;测试守护行为不变;每拆一个记一条 PROGRESS。

- [ ] **RF-2 comicRoutes HTTP 层拆分** · S · P2(可与 FEAT-1 同轮或紧随其后)。

- [ ] **RF-3 密钥存储加固** · M · P1
  `DatabaseSecretStore` 明文存 API key;改为加密存储,处理旧数据迁移与桌面版兼容。
  验收:db 中不再见明文 key;旧库自动迁移;桌面版回归通过。
  (同时服务自用安全与开源就绪。)

- [ ] **RF-4 文档一致性清理** · S · P3
  `docs/` 与代码引用对齐(仓库已有清理先例);体检轮若发现过时引用可顺带登记。

## 4. 缺陷与稳定性(BUG)

- [x] **BUG-0 项目体检与缺陷清单**(= LOOP-1) · S · P0
  已产出:测试基线见 BUG-1/BUG-2/BUG-3;冒烟结论与全部证据见 PROGRESS LOOP-1 条目(2026-10-16)。

- [ ] **BUG-1 server fast 套件 33 个失败** · M–L · P0
  基线(Node v24.14.0):1383 测试 / 1338 过 / **33 失败** / 12 跳过,失败散布 20 个测试文件(全名单见 PROGRESS LOOP-1)。
  初判至少三类:①契约漂移(如 `worldContextGateway` 多传 `openingOnly: undefined`、资源提取 schema 超上限、审批审计条数);②状态断言陈旧(如 `'failed' !== 'done'`);③可能的 Node v24 `deepStrictEqual` 对 undefined 自有键的严格化差异。
  做法:逐条分诊 —— 真 bug 修代码 / 测试陈旧改测试 / 环境差异记档;先修高频文件(bookAnalysisCharacterCandidate ×4、pipelineExecutionLease ×2 等)。
  验收:fast 套件全绿,或有明确豁免清单并写入基线。

- [ ] **BUG-2 client 套件 5 个失败** · S · P1
  基线:92 测试 / 87 过 / **5 失败**。两类:
  ① 移动端合同簇 ×4(`every routed page has a route-specific mobile CSS landing point`、`mobile more menu contains all non-primary registered pages`、`mobile route metadata covers every registered page`、`mobile task filters stay in a compact three-column control grid`);
  ② 设置路由契约 ×1(测试期望 `/settings/model-routes` 重定向到 `/settings/models`,代码已是独立 `ModelRoutesSettingsPage`)。
  初判:多为测试陈旧(路由已演进);需确认移动端 metadata 是测试没更新还是新页面漏注册。
  验收:client test 全绿。

- [ ] **BUG-3 pnpm 配置迁移卫生** · S · P3
  根 `package.json` 的 `pnpm.onlyBuiltDependencies` 已不被 pnpm 读取(每次运行报 WARN),应迁到 `pnpm-workspace.yaml` 或 `.npmrc` 等新位置。
  验收:启动/测试输出无该 WARN。

## 5. 前端 UI 改进(UI)

> 挂靠三份既有决策,不另起炉灶:设计规范 `docs/design/product-ui-design-system.md`、
> 分批落地计划 `docs/plans/product-ui-design-rollout-plan.md`、可视化栈 `docs/design/visualization-stack.md`。
> 既有规则继续有效:低边框视觉规范、项目自有组件、**不新增 shadcn 组件**、不加装饰渐变、硬编码色值只减不增。

- [ ] **UI-1 落实既有设计系统剩余批次** · M · P1
  直接采用 rollout 计划已定批次,不重排:
  第一批(资产库基础与新手入口):共享 Asset Library 页头/空态合同 + `success/warning/info` 语义 token + `/knowledge`、`/genres`、`/base-characters`;
  第二批(核心创作与恢复工作台):`/creative-hub`、`/book-analysis`、`/tasks`、`/auto-director/follow-ups`(含 2A 任务恢复合同 / 2B 拆书工作台 / 2C 创作中枢三阶段);
  随后收尾"部分对齐"8 页(`/novels/:id/preview`、`/edit`、`/chapters/:chapterId`、`/drama` ×2、`/settings`、`/worlds`、`/style-engine`)与"尚未完成"9 页(`/help`、`/comic` ×2、`/chat-legacy`、`/story-modes`、`/anti-ai-rules`、`/settings/model-routes`、`/worlds/generator`、`/worlds/:id/workspace`)。
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

## 6. 开源就绪与运营(OPS)

- [ ] **OPS-1 仓库转公开前历史清理** · S · P0(转公开硬前置)
  删 `refs/remotes/upstream/*` + `git gc --prune=now`,复检历史无旧 key;遵守红线(绝不 push --all/--mirror)。
- [ ] **OPS-2 品牌与命名定稿** · S · P2
  是否改项目名、README/介绍站/包名统一表述;由所有者拍板。
- [ ] **OPS-3 LICENSE / NOTICE / CLA 归属梳理** · S · P2。
- [ ] **OPS-4 对外文档审校** · S · P3。
