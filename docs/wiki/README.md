# 项目开发 Wiki

本目录用于沉淀长期项目知识，帮助未来开发者和 AI Agent 理解项目为什么这样设计，以及后续应该如何维护。

Wiki 不记录单次提交改了什么，也不替代 release notes。它只记录跨阶段仍然有用的架构规则、工作流边界、运行协议、调试经验和产品设计依据。

## 使用方式

- 先从本页找到相关主题，再进入对应分类页面。
- 如果页面内容来自历史计划、设计文档或检查点，保留来源链接，不搬空原文档。
- 如果一次开发澄清了长期规则，应更新对应 Wiki；如果只是小改动或发布流水账，不写 Wiki。
- 新页面默认使用 [entry-template.md](./entry-template.md) 的结构。

## 目录

共 84 篇,按主题分组;新增页面请同步登记到这里。

### Architecture

- [当前模型选择与厂商默认模型边界](./architecture/model-selection.md)
- [导演接管模块边界(Director Takeover Module)](./architecture/director-takeover-module.md)
- [读路径性能边界](./architecture/read-path-performance-boundaries.md)
- [短剧创作模块边界](./architecture/drama-forge-module-boundary.md)
- [伏笔账本生命周期(登记 → 推进 → 回收/逾期 → 提醒)](./architecture/payoff-ledger-lifecycle.md)
- [漫画 HTTP 层模块边界(Comic HTTP Module)](./architecture/comic-http-module.md)
- [模块边界与文档治理](./architecture/module-boundaries.md)
- [模型密钥加密存储(Secret Storage Encryption)](./architecture/secret-storage-encryption.md)
- [配置项归属与可见性规范](./architecture/configuration-conventions.md)
- [任务投影三层契约(后端真实状态 / 运行记录 API / 前端展示)](./architecture/task-projection-contract.md)
- [世界结构化数据模块边界(World Structure Module)](./architecture/world-structure-module.md)
- [世界可视化模块边界(World Visualization Module)](./architecture/world-visualization-module.md)
- [世界可视化资产边界](./architecture/world-visualization-assets.md)
- [世界上下文门面与小说世界边界](./architecture/world-context-gateway.md)
- [事件副作用边界](./architecture/event-side-effect-boundaries.md)
- [图像生成厂商边界](./architecture/image-generation-providers.md)
- [项目级视觉资源目录](./architecture/visual-asset-catalog.md)
- [章节 Runtime 边界](./architecture/chapter-runtime-boundaries.md)
- [章节身份与规划扩展边界](./architecture/chapter-identity-and-planning-boundary.md)
- [章节资产增量模块边界(Chapter Artifact Delta)](./architecture/chapter-artifact-delta-module.md)
- [Novel 应用能力层边界](./architecture/novel-application-services.md)
- [桌面身份与数据目录迁移](./architecture/desktop-identity-migration.md)
- [Server Architecture Migration Plan](./architecture/server-architecture-migration-plan.md)

### Workflows

- [拆书工作流](./workflows/book-analysis-workflow.md)
- [创作意图平台与短篇闭环](./workflows/creation-studio-short-story.md)
- [待确认状态提案自动放行](./workflows/pending-review-auto-promotion.md)
- [读者体验合同](./workflows/reader-experience-contract.md)
- [短剧工作台流程边界](./workflows/short-drama-workspace.md)
- [故事世界图谱投影(Story World Graph)](./workflows/story-world-graph.md)
- [规划变更保存前预览(Planning Change Preview)](./workflows/planning-change-preview.md)
- [角色对话层：以角色主体性承接作者意图](./workflows/character-dialogue-layer.md)
- [角色影响提案：已由角色对话层替代](./workflows/character-influence-proposals.md)
- [角色智能层：思路线 MVP](./workflows/character-intelligence-layer.md)
- [角色资源账本工作流](./workflows/character-resource-ledger.md)
- [卷规划工作流](./workflows/volume-planning.md)
- [懒规划（JIT task sheet）重构（Phase 1）](./workflows/lazy-chapter-planning.md)
- [漫画场景一致性管线](./workflows/comic-scene-consistency.md)
- [漫画分格提示词治理](./workflows/comic-panel-production-prompt-governance.md)
- [漫画角色视觉资产管线](./workflows/comic-character-asset-pipeline.md)
- [批量生成吞吐(Batch Generation Throughput)](./workflows/batch-generation-throughput.md)
- [热门题材雷达与自动导演市场简报](./workflows/market-radar-to-auto-director.md)
- [失败模式 → 恢复动作知识库(Recovery Playbook)](./workflows/recovery-playbook.md)
- [时间线约束层](./workflows/timeline-constraint-layer.md)
- [事实账本（Novel Fact Ledger）](./workflows/novel-fact-ledger.md)
- [通用角色主体与跨来源角色对话](./workflows/universal-character-conversation.md)
- [图片生成确认与统一运行时](./workflows/image-generation-confirmation-runtime.md)
- [小说版本快照保留规则](./workflows/novel-snapshot-retention.md)
- [小说封面主画面生成链路](./workflows/novel-cover-image-generation.md)
- [章节生产链路](./workflows/chapter-production-chain.md)
- [章节资产 Delta 抽取可靠性](./workflows/chapter-artifact-delta-reliability.md)
- [章节自动恢复与预算所有权](./workflows/chapter-automatic-recovery.md)
- [质量债务根因归因（Phase 0）](./workflows/quality-debt-attribution.md)
- [桌面版本号与发布标识规则](./workflows/desktop-release-versioning.md)
- [自动导演 Runtime 与恢复边界](./workflows/auto-director-runtime.md)
- [自动导演：角色候选自动确认](./workflows/auto-director-candidate-auto-confirm.md)
- [自动导演本书世界准备](./workflows/auto-director-world-setup.md)
- [自动导演故事星图](./workflows/auto-director-idea-constellation.md)
- [自动导演新增阶段检查清单](./workflows/auto-director-stage-checklist.md)
- [Creative Hub 边界](./workflows/creative-hub-boundary.md)
- [LLM 实况执行与任务可见性](./workflows/llm-live-execution.md)
- [Payoff Ledger 来源与同步合同](./workflows/payoff-ledger-contract.md)

### Prompts

- [平台写法配置与正文 Prompt 可编辑合同](./prompts/platform-writing-profiles.md)
- [世界提示词模块(World Prompt Modules)](./prompts/world-prompt-modules.md)
- [提示词执行器模块边界(Prompt Runner Module)](./prompts/prompt-runner-module.md)
- [小说生成质量守卫机制](./prompts/novel-generation-quality-guards.md)
- [Prompt Registry 与结构化输出](./prompts/prompt-registry-and-structured-output.md)

### RAG

- [知识库与上下文组装](./rag/knowledge-and-context-assembly.md)
- [RAG 索引模块边界(RAG Index Module)](./rag/rag-index-module.md)

### Debugging

- [角色连续性与硬事实排查](./debugging/character-continuity-hard-facts.md)
- [日志保留与轮转规则](./debugging/log-retention.md)
- [章节可靠性隔离验证](./debugging/chapter-reliability-isolated-tests.md)
- [重复故障模式与排查路径](./debugging/recurring-failure-modes.md)
- [LLM 限速器内存泄漏与淘汰机制](./debugging/llm-request-limiter-memory-leak.md)

### Product

- [对外文档维护规则(README / docs/public / 文档站)](./product/public-docs-maintenance.md)
- [工作台状态表达与下一步合同](./product/workspace-status-expression.md)
- [简易创作模式](./product/simple-creation-mode.md)
- [品牌与身份](./product/brand-and-identity.md)
- [设置页创作可用性原则](./product/settings-readiness.md)
- [实验特性（漫画 / 短剧）的产品定位](./product/experimental-features.md)
- [世界骨架生成流程](./product/world-skeleton-generation.md)
- [新手优先与整本小说完成原则](./product/beginner-first-novel-completion.md)
- [许可、归属与贡献授权(Licensing & Attribution)](./product/licensing-and-attribution.md)
- [叙事引擎工作台长期蓝图](./product/narrative-engine-studio.md)
- [运行记录与 AI 创作实况的产品边界](./product/task-center-role.md)
- [GitHub Pages 公开介绍站](./product/github-intro-site.md)

## 写作边界

Wiki 应写：

- 长期架构决策和原因。
- 自动导演、章节生产、Creative Hub、Prompt、RAG、任务状态等核心链路的边界。
- 可重复使用的调试结论和排查路径。
- 新手优先、整本完成、低认知负担等产品原则如何影响实现。

Wiki 不应写：

- 单次提交的文件修改清单。
- 临时 TODO。
- 发布说明复制。
- 很快会废弃的实现细节。
- 只描述“本次改了什么”的流水账。

## 与其他 docs 目录的关系

- `docs/wiki/`：稳定知识和原因。
- `docs/plans/`：仍有执行价值的方案和任务拆解。
- `docs/design/`：系统设计、领域模型和产品机制。
- `docs/releases/`：用户可见更新历史。
- `README.md`：对外入口和最新公开摘要。
