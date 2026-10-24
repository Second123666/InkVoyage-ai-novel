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

## 2026-10-24 · LOOP-26 · RF-1 第七个文件:`RagIndexService.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/rag/RagIndexService.ts`(1242 行,RAG 索引核心服务)。
- **拆分方案**:
  1. `ragIndexChunking.ts`:纯分块逻辑(`isCjk`、`normalizeRagPreChunks`、`buildRagChunkCandidates`、`buildRagContextualDocumentMap`);
  2. `ragIndexSourceLoading.ts`:`buildJoinedText`、`loadRagSourceDocuments`(prisma 读取,注入 `normalizeRagPreChunks`);
  3. `ragIndexEmbedding.ts`:`embedRagTextsInBatches`(接收 `EmbeddingService` 参数);
  4. 服务文件保留队列管理、进度快照、`upsertOwnerChunks`/`deleteOwnerChunks` 编排、`syncKnowledgeDocumentIndexStatus`。
- **行为约束**:并发配置、进度上报阈值(3%)、事务边界不变;公共 API(`RagIndexService` 构造签名、`RagJobCancelledError`、`RagJobProgressSnapshot`、`RagJobSummaryRecord`)不变;`prisma.ragIndexJob` 字符串保留在服务文件。
- **验证**: server build 通过;定向 `ragChunking`/`ragContextualChunk`/`ragJobListing`/`knowledgeServiceStatus`/`ragCompatibilityBootstrap` **18/18**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 1 个文件(`promptRunner.ts`)。
- **下一步**: **LOOP-27 = RF-1 第八个文件(最后一个)**。

## 2026-10-24 · LOOP-25 · RF-1 第六个文件:`novelDirectorTakeover.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/novel/director/runtime/novelDirectorTakeover.ts`(1158 行,导演接管决策/就绪模块,纯函数无 IO)。
- **拆分方案**:
  1. `takeoverTypes.ts`:共享类型 + 阶段/入口元信息;
  2. `takeoverInput.ts`:种子素材判定、构思/候选、`buildDirectorTakeoverInput`;
  3. `takeoverSnapshot.ts`:资产快照就绪谓词;
  4. `takeoverMapping.ts`:阶段/入口/工作流映射与 `buildSkipSteps`;
  5. `takeoverPlan.ts`:执行延续、阶段计划、自动执行计划、`resolveDirectorTakeoverPlan`;
  6. `takeoverReadiness.ts`:各步骤就绪度、预览、`buildDirectorTakeoverReadiness`、`assertDirectorTakeoverPhaseAvailable`;
  7. `takeoverBookSpec.ts`:`buildTakeoverBookSpec`;
  8. `index.ts` 显式门面只导出原公共 API;原文件保留兼容门面。
- **行为约束**:判断阈值、文案、跳步语义、计划解析逻辑逐行搬运;门面只导出原公共 API,内部谓词与元信息不外泄;保持纯函数(无 IO、无状态)。
- **验证**: server build 通过;定向 `novelDirectorTakeover` + `directorTakeoverExecutionContract` **17/17**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 2 个文件(`promptRunner.ts`、`RagIndexService.ts`)。
- **下一步**: **LOOP-26 = RF-1 第七个文件**。

## 2026-10-24 · LOOP-24 · RF-1 第五个文件:`comicRoutes.ts`(同轮达成 RF-2)

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/modules/comic/http/comicRoutes.ts`(1071 行,64 条路由);同轮覆盖 RF-2(comicRoutes HTTP 层拆分)。
- **拆分方案**:
  1. `comicRouteSchemas.ts`:跨领域共享的参数与请求体 Schema;
  2. `comicRouteContext.ts`:模块级服务单例(`ComicProjectService` / `ComicEpisodePlanService` / `ComicPanelScriptService`);
  3. 8 个领域注册器(每文件一个 `registerXxx(router)`):项目/剧集/事实、分镜脚本、角色与立绘、分镜图片与气泡、成片导出、批量任务、角色资产、场景;
  4. `comicRoutes.ts` 降为 23 行入口,按**原注册顺序**调用注册器,保持 `export default router`。
- **行为约束**:路由路径/方法/校验/处理函数体逐行搬运,不改业务逻辑;服务实例仍为模块级单例;领域内专用 Schema 留在注册器文件。
- **验证**: server build 通过;路由数量守卫 **HEAD 64 条 vs 拆分后 8 文件合计 64 条**;`comicDecoupling` **2/2**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 漫画为实验特性的内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 3 个文件(`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`)。
- **下一步**: **LOOP-25 = RF-1 第六个文件**。

## 2026-10-24 · LOOP-23 · RF-1 第四个文件:`ChapterArtifactDeltaService.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/novel/runtime/ChapterArtifactDeltaService.ts`(1302 行,章节生产核心链路)。
- **拆分方案**:
  1. `artifactSync/chapterArtifactDelta.shared.ts`:共享类型、角色解析/知识边界/账本键/上下文文本工具、角色名册、章节引用解析、`assertExpectedChapterContentInTransaction` 版本守卫;
  2. `artifactSync/chapterArtifactPayoffConsumer.ts`:`applyPayoffDeltas` 伏笔账本增量消费者(显式函数);
  3. 服务文件保留公共类型/消费者枚举、提取与分发编排、摘要/快照/角色资源/动态/知识/心智/对话影响与 RAG 队列;
  4. `mergeKnowledgeBoundaryState` 继续由服务文件 re-export,外部公共 API 不变。
- **行为约束**:`CHAPTER_ARTIFACT_CONSUMERS` 顺序、事务边界、`expectedChapterContent` 栅栏、伏笔 `manualLocked` 语义与错误信息均未改动。
- **验证**: server build 通过;定向 `chapterRuntimeCoordinator` **14/14**;全量首跑发现 `payoffLedgerMvp` 静态守卫仍读旧文件,已改指伏笔消费者模块;修正后 server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 4 个文件(`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-24 = RF-1 第五个文件**。

## 2026-10-24 · LOOP-22 · RF-1 第三个文件:`world.prompts.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/prompting/prompts/world/world.prompts.ts`(1312 行,含 14 个 PromptAsset)。
- **拆分方案**:
  1. `world.prompts/worldReference.prompts.ts`:参考灵感、概念卡、概念卡本地化;
  2. `world.prompts/worldOptions.prompts.ts`:属性选项、深挖问题;
  3. `world.prompts/worldGeneration.prompts.ts`:分层生成/本地化、结构回填、主题世界、结构分区、公理建议;
  4. `world.prompts/worldQuality.prompts.ts`:可视化、一致性、导入抽取;
  5. `world.prompts/worldPromptHelpers.ts`:参考方式标签、宽松对象清洗;
  6. `world.prompts/index.ts`:显式门面;原文件保留兼容门面,注册表与业务导入路径不变。
- **行为约束**:14 个资产的 `id/version/taskType/mode/contextPolicy/outputSchema/render` 均未改动;注册表仍按原路径加载。
- **验证**: server build 通过;全量套件首跑发现 `powerSystemPreference.test.js` 静态守卫仍读取旧文件,已将守卫指向承载提示词的 `worldGeneration.prompts.ts`;修正后 server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 5 个文件(`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-23 = RF-1 第四个文件**。

## 2026-10-23 · LOOP-21 · RF-1 第二个文件:`worldVisualization.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/world/worldVisualization.ts`(1082 行)。
- **拆分方案**:
  1. `worldVisualization/shared.ts`:类型、上限常量、方向坐标、势力类型别名、关系标签、文本/JSON 工具、`makeId`/`normalizeTextField`;
  2. `worldVisualization/faction.ts`:势力节点/边推断与归一化、自由文本势力抽取、力量层级、时间线;
  3. `worldVisualization/geography.ts`:方向/坐标/区域/路线归一化、地理节点/边归一化与地图构建;
  4. `worldVisualization/payload.ts`:结构化优先、自由文本兜底、LLM 草稿清洗、公共入口;
  5. `worldVisualization/index.ts`:显式门面,仅导出原公共 API;原文件保留兼容门面。
- **边界**:`shared ← faction`、`shared ← geography`、`faction/geography/shared ← payload`,无循环;结构化优先与兜底顺序不变。
- **验证**: server build 通过;定向 `worldVisualization/worldStructure/storyWorldSlice/bookFraming` **18/18**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 typecheck 0 错误 / 238/238。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 6 个文件(`world.prompts.ts`、`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-22 = RF-1 第三个文件**。

## 2026-10-23 · LOOP-20 · RF-1 大文件拆分(首个:`worldStructure.ts`)

- **类别**: 重构(行为不变;主对话执行)
- **目标**: BACKLOG RF-1 —— 一次拆一个超过 1000 行的文件,测试守护行为不变。本轮拆分 `server/src/services/world/worldStructure.ts`(1311 行)。
- **拆分方案**:
  1. `worldStructure/shared.ts`:常量、`WorldStructureSource`、JSON/文本/ID/去重/规则文本工具、空结构构造器;
  2. `worldStructure/normalize.ts`:全部归一化函数 + `parseWorldStructurePayload`;
  3. `worldStructure/legacy.ts`:旧字段种子生成、旧字段文本构建、`applyStructuredWorldToLegacyFields`、`buildWorldStructureOverview`(总览消费旧字段文本构建器,放在这里避免循环);
  4. `worldStructure/projection.ts`:仅 `buildWorldBindingSupport`;
  5. `worldStructure/index.ts`:显式门面,只导出原公共 API;原 `worldStructure.ts` 保留一行兼容门面,外部导入路径不变。
- **边界**:依赖方向 `shared ← normalize ← legacy`、`shared ← projection`、`legacy → projection`(仅 apply 默认参数),无循环;不从业务代码深引用内部文件;不新增泛化 `utils` 目录。
- **验证**: server build 通过;定向 `worldStructure/worldVisualization/storyWorldSlice/bookFraming` **18/18**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与 LOOP-19 基线一致)。client 未动,沿用 LOOP-19 typecheck 0 错误 / 238/238。
- **拆分过程修正**(静态检查发现):跨文件工具需显式导出;`normalizeLocation` 需导出给 legacy;归一化 metadata 需引入 `WORLD_STRUCTURE_SCHEMA_VERSION`;总览若留在 projection 会与 legacy 形成循环,已移入 legacy。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过发布说明与 README。
- **残留**: RF-1 剩余 7 个文件(`world.prompts.ts`、`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`worldVisualization.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-21 = RF-1 第二个文件**,优先选职责边界清晰的 `world.prompts.ts` 或 `worldVisualization.ts`。

## 2026-10-23 · LOOP-19 · 批量生成吞吐优化(INN-D3)

- **类别**: 创新/性能(D 线成本与效率;主对话执行)
- **目标**: BACKLOG INN-D3 —— 批量生成吞吐优化。
- **现状审计**: 章节正文/摘要/事实/状态有严格前序依赖,自动导演按章串行;节奏段章节列表携带前段摘要,按 beat 串行;拆书角色已有 worker pool(并发 3);导演候选书名补强已 `Promise.all`;唯一安全且明显的串行缺口是**角色外显资料批量生成** —— 逐角色 `await`,每个角色独立读取上下文并调用一次结构化模型。
- **改动**:
  1. 新纯函数 `characterVisibleProfileBatch.ts`:`runCharacterVisibleProfileBatch` 有界并发(默认 3)、slot 回填保证结果/跳过项按输入顺序返回、单项失败隔离;
  2. `generateBatchVisibleProfiles` 改为复用批次函数,移除串行循环;
  3. 边界:不并行章节生产链/节奏段章节列表;不绕过 provider requestLimiter;
  4. wiki `workflows/batch-generation-throughput.md`、计划 `docs/plans/batch-throughput.md`、发布说明性能条目。
- **验证**: server **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(新增 4 条:并发上限与顺序、失败隔离、自定义并发/空列表、接线);client typecheck 0 错误、**238/238**。测试观测 maxActive = 3,完成顺序反转时结果仍按输入顺序。
- **验收对照**: 「批量生成吞吐优化」= 独立批量任务串行改有界并发,等待约降至 1/3(受限速影响);顺序与失败语义不变;章节链保持串行。
- **残留**: 批次层预加载共享小说上下文、动态并发配置不做;真实耗时收益待所有者实测。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-20 = RF-1 大文件拆分(首个文件,行为不变)**。

## 2026-10-23 · LOOP-18 · 本地模型离线跑审校与摘要(INN-D2)

- **类别**: 创新(D 线成本与效率;主对话执行)
- **目标**: BACKLOG INN-D2 —— 补 Ollama 兼容层,让审核/摘要可离线跑。
- **现状审计**: Ollama 兼容层主体已存在 —— 免密钥内置厂商、默认 `127.0.0.1:11434/v1`、模型目录优先 `/api/tags` 并回退 `/models`、工厂以 `"ollama"` 占位密钥、结构化输出固定 `prompt_json`、RAG 嵌入候选含本机模型,且已有单测。缺口是最后一公里:模型路由页没有"审校/摘要离线跑"入口,免密钥厂商的文案仍提示配置 API Key。
- **改动**:
  1. 模型路由页「本机跑审校与摘要」预设:纯函数 `LOCAL_OFFLINE_TASK_TYPES`(review/light_review/critical_review/summary)+ 本机厂商筛选 + 草稿构建(温度 0.3);按钮只填草稿、提示确认后保存,不影响正文/修复/重规划;
  2. 免密钥文案:厂商状态卡对 `requiresApiKey=false` 改为提示启动本地服务/选择模型,余额区域说明本机模型不需要余额;
  3. 修复兼容缺陷:本机 Qwen 模型(如 `qwen3:8b`)此前仅凭模型名被归入 `custom_openai_compatible_qwen`,现在先归入 `ollama` 家族;
  4. wiki `architecture/model-selection.md`、计划 `docs/plans/local-model-offline.md`、发布说明与 README。
- **验证**: server **1444 测试 / 1432 过 / 0 失败 / 12 跳过**(新增 3 条守卫);client **238/238**(新增 4 条);双端 typecheck 0 错误。新增守卫首跑即捕获 Qwen family 误判,修复后通过。
- **验收对照**: 「补 Ollama 兼容层」= 既有能力审计 + 守卫测试固定 + 分类缺陷修复;「审核/摘要可离线跑」= 一键预设 + 保存后四类任务走本机。
- **残留**: 原生 `/api/chat` 协议、自动拉取模型、自动探测本机服务、自动切换路由不做;正文生成不建议用本机模型(上下文窗口小);UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-19 = INN-D3 批量生成吞吐优化(M/P3)**。

## 2026-10-22 · LOOP-17 · 全链路 token 预算与成本报表(INN-D1)

- **类别**: 创新 + 功能收束(D 线成本与效率;主对话执行)
- **目标**: BACKLOG INN-D1 —— 把拆书的 token 预算守卫扩展到生产链;每本书出成本报表。
- **现状审计**: 拆书已有 `BookAnalysisBudgetGuard`;自动导演有固定单步/单章异常阈值;LOOP-11 已有按书成本报表 API 但无前端入口;缺可配置的本书预算与用户可见报表。
- **改动**:
  1. 预算配置 `AppSetting.llm.production_token_budget`(`defaultTokens` + 按书覆盖),服务 `ProductionTokenBudgetSettingsService`;解析优先级本书覆盖 > 全局默认,非法值按未设置;
  2. 用量与判定 `ProductionTokenBudgetService`:累计取 `LlmUsageEvent` 按 novelId 求和;严格大于才算超限;读取失败按未设置处理,不误停主链;
  3. 章节边界拦截:`resolveUsageCircuitBreaker` 增加本书预算检查;超限以 reason `token_budget_exceeded` 打开熔断(问题码 `runtime.token_budget_exceeded`,恢复动作 `resume_after_review`),只暂停不删除内容;
  4. 端点 `GET/PUT /api/production-budget/:novelId`;成本报告端点保持只读;
  5. 前端生产看板 `ProductionCostPanel`:近 30 天费用概览 + 任务前列 + 累计用量/预算输入;未定价模型明确提示;超限提示恢复方式;
  6. 共享契约 `shared/types/costControl.ts`(成本报告类型迁入 + 预算设置/状态);计划、wiki、发布说明与 README。
- **验证**: server **1441 测试 / 1429 过 / 0 失败 / 12 跳过**(新增 7 条守卫);client **234/234**(新增 2 条);双端 typecheck 0 错误。途中修 1 处契约冲突:成本报告路由只读守卫拒绝预算 PUT,遂拆分独立 `production-budget` 路由。
- **验收对照**: 「预算守卫扩展到生产链」= 本书预算 + 章节边界熔断 + 可恢复;「每本书出成本报表」= 看板费用概览 + 既有报表 API。
- **残留**: 自动按预算切换路由、全局预算设置页、手动单章生成的预算拦截不做;UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-18 = INN-D2 本地模型(Ollama 兼容)接入(M/P3)**。

## 2026-10-21 · LOOP-16 · 规划变更保存前预览(INN-C3)

- **类别**: 创新 + UI(C 线交互与可视化;主对话执行)
- **目标**: BACKLOG INN-C3 —— 规划/章节修改先预览 diff 再落盘。
- **现状审计**: 章节 AI 改写(候选 diffChunks)、故事线/卷版本 diff、世界同步 diff 均已有预览;缺口是卷战略与节奏/拆章保存 —— 整份 `VolumePlanDocument` 草稿直接写入并创建新版本,保存前看不到会导致哪些卷/章节变化。
- **改动**:
  1. 纯 diff 模型 `components/structuredOutline/volumeWorkspaceDiff.ts`:按卷 id/章节 id 匹配,分类新增/移除/移动(章序或跨卷)/字段修改,中文标签 + 确定性排序,跨卷移动不重复计字段修改;
  2. 保存门禁 `usePlanningSavePreview` hook:卷战略与节奏拆章两个保存入口统一先算 diff;无基线或无改动直接保存,有改动先确认;页面只注入保存 mutation;
  3. 确认弹窗 `VolumeWorkspaceSaveDiffDialog`:汇总徽标 + 分组列表;节奏拆章说明"同步到章节执行区、已有正文保留、卷纲外章节不自动删除",卷战略说明会记录新规划版本;
  4. 新文件归入 `structuredOutline/` 责任目录;wiki `workflows/planning-change-preview.md` + 计划 `docs/plans/planning-change-preview.md`;发布说明与 README 用户可见条目。
- **验证**: client typecheck **0 错误**;client **232/232**(新增 3 条守卫:分类/跨卷/空基线、无改动、保存入口与弹窗装配);server 未动沿用 LOOP-13 全绿(1434/0)。途中修 1 处自写测试期望(总变更章节数漏算跨卷移除)。
- **验收对照**: 规划修改 = 保存前确认弹窗(本轮补齐);章节修改 = AI 改写候选 diff 与版本历史 diff(既有)。
- **残留**: 后端 diff 端点、自动修复、手动正文编辑 diff 不做;UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-17 = INN-D1 全链路 token 预算与成本报表(M/P2)**。

## 2026-10-21 · LOOP-15 · 生产看板(INN-C2)

- **类别**: 创新 + UI(C 线交互与可视化;主对话执行)
- **目标**: BACKLOG INN-C2 —— 章节状态、质量债务热点、卷进度一屏总览。
- **现状审计**: 小说详情接口的 Chapter 不含聚合状态/字数/债务;既有 `GET /novels/:id/simple-shelf` 已派生 8 态 status、wordCount 与 qualityDebt,`GET /novels/:id/volumes` 返回章序映射 —— 看板直接复用两个既有投影,零新增后端契约。
- **改动**:
  1. 纯聚合模型 `productionBoardModel.ts`(可单测):状态分布(8 态固定顺序含零项)、总字数/完成率、待处理章节(error → replan_required → quality_debt,同组按章序)、质量债务热点(按 issueCodes 数降序取前 5)、卷进度(章序映射,含未挂卷计数);
  2. 页面 `/novels/:id/production-board`(路由级懒加载):统计徽标 + 状态条形分布 + 待处理/债务热点双栏 + 卷进度,条目直达章节页;两数据源独立请求,卷进度失败不影响其余区块;
  3. 入口:小说工作区「项目工具」弹窗「打开生产看板」;
  4. 移动端合同(路由元数据/CSS 落点/导航测试);
  5. 发布说明与 README 用户可见条目;计划 `docs/plans/production-board.md`。
- **验证**: client typecheck **0 错误**;client **229/229**(新增 3 条守卫:聚合模型、路由/入口/装配含"不得回退详情接口"、移动端合同);server 未动沿用 LOOP-13 全绿(1434/0)。类型修正:初版误用详情接口的 Chapter(缺 status/wordCount/qualityDebt),typecheck 拦截后改为 simple-shelf + volumes。
- **验收对照**: 「章节状态、质量债务热点、卷进度一屏总览」= 看板三区块 + 头部统计,条目可直达处理位置。
- **残留**: 看板内编辑动作、跨书对比不做;UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-16 = INN-C3 变更 diff 预览(S–M/P3)**。

## 2026-10-21 · LOOP-14 · 故事世界图谱前端渲染(INN-C1 次轮,整项完成)

- **类别**: 创新 + UI(C 线交互与可视化;主对话执行)
- **目标**: INN-C1 次轮 —— 把只读图谱投影呈成可交互页面;完成整项「可交互图谱」验收。
- **改动**:
  1. **图谱页** `/novels/:id/story-graph`(`StoryGraphPage`,路由级 `React.lazy`):标题/说明/统计徽标(角色/势力/地点/要素/关系)+ 加载、失败重试、空态引导、世界切片缺失警示;
  2. **画布** `StoryGraphCanvas`(**二次懒加载 chunk**,`@xyflow/react` 与样式仅在画布 chunk 引入,首屏零增量):四类节点语义 token 配色(primary/warning/info/muted)、关系边动画、节点拖动、点击节点显示摘要与 meta、图例 + 控件;
  3. **布局纯函数** `storyGraphLayout.ts`:确定性同心环(势力 150 → 角色 320 → 地点 480 → 要素 620),可单测;
  4. **入口**:小说角色工作区「关系」页签顶部新增「故事世界图谱」按钮(与仅角色的关系图互补);
  5. **移动端合同**:`MOBILE_ROUTE_PATTERNS` 新增 `story-graph`(小说分组,标题「故事世界图谱」)+ `index.css` 两个移动块补 CSS 落点 + 导航测试 routedPaths 更新;
  6. 客户端 API `getStoryWorldGraph` + queryKey;发布说明与 README 更新(本轮为用户可见新页面)。
- **验证**: client typecheck **0 错误**;client **226/226**(222 + 4 条新守卫:布局确定性/懒加载合同/路由与入口/移动端合同);server 本轮未动,沿用 LOOP-13 全绿(1434/0);视觉与交互验收(桌面+移动、明暗两套)按仓库规则留给所有者。
- **验收对照**: INN-C1「世界结构数据做成可交互图谱」达成 —— 数据底座(首轮)+ 可交互渲染(次轮);图谱为独立页面,不干扰主链页面。
- **残留**: UI 实测问题留待验收反馈;图谱编辑动作、时间线/地理子视图属后续可视化轮次(UI-3 队列)。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-15 = INN-C2 生产看板(M/P3)**;其后 C3 → D 线 → RF/BUG/UI/OPS。

## 2026-10-21 · LOOP-13 · 故事世界图谱投影(INN-C1 首轮)

- **类别**: 创新(C 线交互与可视化;主对话执行;**多轮项,本轮只做只读数据投影**)
- **目标**: BACKLOG INN-C1「世界结构数据做成可交互图谱」的数据底座 —— 小说级 角色×势力×地点 图谱投影 + 只读端点;React Flow 渲染次轮。
- **现状审计**: 世界维度已有 `WorldVisualizationPayload`(不含角色、非小说级);小说侧切片/关系阶段/势力轨迹/角色数据齐备;无小说级聚合图谱。
- **改动**:
  1. 共享契约 `shared/types/storyWorldGraph.ts`(节点 character/faction/location/element;边 character_relation/faction_membership;stats 含截断前总数与 truncated);
  2. 纯函数投影 `services/novel/state/storyWorldGraph.ts`:切片势力与轨迹势力按名称归一合并(切片优先)、仅当前关系阶段且双方存在、成员边取每角色×势力最新轨迹、节点≤200/边≤400 稳定截断并统计;
  3. 服务取数(角色/当前关系阶段/势力轨迹/切片 JSON safeParse 损坏回退)+ **只读端点** `GET /api/story-graph/:novelId`。
- **验证**: server **1434 测试 / 1422 过 / 0 失败 / 12 跳过**(新增 5 条:合并去重与边过滤、成员最新轨迹、上限截断与统计、切片解析回退、服务取数与 404、静态契约);client 未动沿用既往结论。无 schema 变更。途中修 3 个自写缺陷(笔误、两处夹具未产生预期有效边)。
- **验收对照**: C1 整体为「可交互图谱」;本轮交付数据底座与端点,次轮接 React Flow(懒加载、不新引依赖)后整项再打勾 ✅。
- **发布说明**: 内部端点(UI 未消费),按规则跳过并注明。
- **下一步**: **LOOP-14 = INN-C1 次轮(前端图谱渲染)**:小说页或世界工作区接入 `/api/story-graph`,React Flow 节点/边渲染 + 基础交互(缩放/点击节点查看摘要);随后 C2 → C3 → D 线。

## 2026-10-20 · LOOP-12 · 失败模式 → 恢复动作知识库(INN-B4)

- **类别**: 创新(B 线 Agent 架构;主对话执行)
- **目标**: BACKLOG「把常见暂停/失败原因沉淀为结构化 原因→恢复动作,自动导演恢复更聪明」。
- **现状审计**: 跟进层已有 11 个 reason→动作解析;结构化失败信号散落在 failureCode(14 码)、noticeCode(3 码)、章节 failureClassification(5 码);**无统一的知识注册表**,运行时/UI 无法据此给出统一恢复指引。
- **改动**:
  1. 共享契约 `shared/types/recoveryPlaybook.ts`(条目含 码/短名/原因解释/用户视角动作/模式/可重试)+ `UnifiedTaskDetail.recoveryGuidance` 可选字段;
  2. **注册表** `services/task/recoveryPlaybook.ts`:**20 条目**覆盖全部既有结构化码 + 人工恢复合成条目(`manual_recovery_required`)+ `unknown_failure` 兜底;解析优先级 = 人工恢复(最高,不被具体码覆盖)> failureCode > noticeCode > classification > 兜底 > null;纯确定性映射,零 LLM、零自由文本关键词判断;
  3. **接线**:`TaskCenterService.getTaskDetail` 唯一装饰点附加 `recoveryGuidance`(加法字段,适配器零改动);
  4. **只读目录端点** `GET /api/recovery-playbook`;
  5. 语义约束:质量提醒类 inspect+不可重试(质量债≠失败)、重规划类 replan、租约丢失 auto_retry、人工恢复不可重试。
- **验证**: server **1429 测试 / 1417 过 / 0 失败 / 12 跳过**(新增 4 条:词表覆盖+形状、优先级含反例、语义抽样、静态契约);client 未动沿用既往结论。本轮无 schema 变更。
- **验收对照**: 「结构化 原因→恢复动作」= 注册表+解析器;「恢复更聪明」= 任务详情统一携带指引(前端展示后置);人工恢复语义优先受测试保护。
- **发布说明**: 内部字段(UI 未消费),按规则跳过并注明。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-13 = INN-C1 故事世界图谱可视化(M–L/P2)**(可视化栈已定盘,需拆分多轮;首轮建议先做数据契约与只读图谱端点);其后 C2 → C3 → D 线。

## 2026-10-20 · LOOP-11 · 成本感知模型路由(INN-B3)

- **类别**: 创新(D 线成本与效率,与 B 线交叉;主对话执行)
- **目标**: BACKLOG「便宜模型跑规划/摘要/审核,强模型跑正文;配额感知;按任务类型可配策略」;验收 = 同一本书两种路由的成本对比可见(配合 INN-D1)。
- **现状审计**: `ModelRouteConfig` 已实现按任务类型路由;usageTracking 已按调用记录 taskType/novelId/token 但只聚合到任务行;**无按书流水表、无价格数据** —— 缺口 = 按书记账 + 价格 + 对比。
- **改动**:
  1. **`LlmUsageEvent` 表**(双 schema + 双迁移):按书 LLM 调用流水(novelId/taskType/provider/model/tokens/duration;无书上下文不写,设置页与预览不污染);
  2. **计量钩子**:`recordTrackedLlmUsage` fire-and-forget 写流水(失败吞掉);
  3. **价格配置** `ModelPricingSettingsService`(AppSetting `llm.model_prices`,`provider::model` → 每百万 token 输入/输出单价;非法条目跳过)+ 设置端点 `GET/PUT /api/settings/model-prices`;
  4. **成本报告** `ModelCostReportService`:纯函数 `buildCostReport` 按 taskType 聚合出「实际成本 / 当前路由成本 / 最便宜模型 / 最贵模型 / 节省额 + 未定价模型清单」;窗口默认 30 天(1-365 夹取);只读入口 `GET /api/cost-report/:novelId?days=30`;
  5. 明确不做:价格只影响报表,不自动切换真实路由(自动路由策略属后续);前端展示与 D1 报表后置联动。
- **验证**: server **1425 测试 / 1413 过 / 0 失败 / 12 跳过**(新增 7 条:价格解析/成本数学/对比报告/空窗口/取数窗口与 prisma-stub/保存校验/静态契约);client 未动沿用既往结论;双迁移对齐通过。途中修 2 个自写缺陷:Express5 params 类型(string[] 联合)需 String() 收敛、静态契约正则未允许换行;另自纠一处算错的测试期望(经济路由总量 0.247)。
- **验收对照**: 「同一本书两种路由成本对比可见」= 报告三列成本 + 节省额,API 可查;前端展示留后续。
- **发布说明**: 内部能力(API 无 UI),按规则跳过并注明。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-12 = INN-B4 失败模式 → 恢复动作知识库(S–M/P3)**;其后 C 线 → D 线。

## 2026-10-20 · LOOP-10 · 全链路 Trace 与决策回放(INN-B1)

- **类别**: 创新(B 线 Agent 架构;主对话执行)
- **目标**: 把分散的生成信号持久化为"每章为什么这么写"的结构化轨迹并支持只读回放(排障 + 可解释 Agent 展示点)。
- **现状审计**: 检索 trace(采样、无 chapterId)、提示词遥测(内存态)、gating decisions(仅进 package)、compressionLog(仅 console.debug)、审核/验收(已落库但分散)—— 无任何一处聚合持久化。
- **改动**:
  1. **模型** `ChapterGenerationTrace`(双 schema + 双迁移,纯新表;索引 novelId+chapterId+createdAt / novelId+chapterOrder;无级联关系);
  2. **压缩日志入场**:`GenerationContextPackage.contextCompressionLog`(dropped/summarized/usedTokens/budgetTokens),装配器把既有 `buildCompressionLog` 结果同时写入 package(此前仅 console.debug);
  3. **轨迹服务** `chapterGenerationTraceService`:纯函数 `buildChapterGenerationTraceSections` 组装四段快照(context: gating 决策+压缩日志;generation: provider/model/temperature/runId;audit: 总分/各报告 issue codes/开放问题码/blocking;decision: 验收状态/repairability/decisionReason/failureCode/重规划建议)+ `record`/`list`;
  4. **定稿钩子**:`ChapterContentFinalizationService` fire-and-forget 写入,失败吞掉(诊断数据不得影响主链);
  5. **只读 API**:`GET /api/chapter-traces/:novelId/:chapterId`(最近 5 条,多行即多次生成/修复历史)。
- **验证**: server **1418 测试 / 1406 过 / 0 失败 / 12 跳过**(新增 4 条:四段组装、record/list prisma-stub 往返、钩子与路由只读静态契约、压缩日志字段);client 未动沿用既往结论;双迁移对齐测试通过。
- **验收对照**: 「任一已生成章节能查到为什么这么写的结构化轨迹」= 定稿即落轨迹 + 按章节只读查询,测试锁定;检索 trace 关联(需给 RagRetrievalTrace 加 chapterId)与前端回放 UI 后置。
- **发布说明**: 本轮为**内部能力**(轨迹目前仅接口可查,无用户可见入口),按发布说明规则显式跳过。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-11 = INN-B3 成本感知模型路由(M/P2)**;其后 B4 → C 线 → D 线。

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
