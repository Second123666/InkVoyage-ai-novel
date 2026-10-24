# LOOP-23 计划 · RF-1 第四个文件:`ChapterArtifactDeltaService.ts`

更新:2026-10-24
状态:进行中
配套:BACKLOG RF-1

## 1. 现状审计

`server/src/services/novel/runtime/ChapterArtifactDeltaService.ts` 1302 行,是章节资产增量的核心消费者编排。文件混合:

1. 公共输入/输出类型、消费者枚举;
2. 纯文本工具:角色解析、知识边界、账本键、上下文文本构建;
3. 章节正文版本守卫与章节引用解析;
4. 编排:提取、按消费者应用、同步结果聚合;
5. 各消费者实现:摘要/事实、状态快照、角色资源、伏笔、角色动态、知识、心智、对话影响;
6. 伏笔账本增量写入。

该链路属于章节生产核心,行为必须保持不变。

## 2. 拆分方案(行为不变)

- `artifactSync/chapterArtifactDelta.shared.ts`:共享类型、纯文本工具、角色名册文本、章节引用解析、正文版本守卫;
- `artifactSync/chapterArtifactPayoffConsumer.ts`:`applyPayoffDeltas` 伏笔账本增量消费者(显式函数,不再依赖 `this`);
- 原服务保留:公共类型、消费者枚举、编排入口、摘要/状态快照/角色资源/动态/知识/心智/对话影响实现、RAG 队列;
- 原文件继续导出 `mergeKnowledgeBoundaryState`(测试与外部调用依赖),通过 `export { ... } from` 保持公共 API。

## 3. 拆分原则

- 只移动代码、补充导入导出,不改任何业务判断、排序、事务边界与错误信息;
- 版本守卫、锁语义、`expectedChapterContent` 栅栏保持原实现;
- 消费者模块只接收显式输入并直接使用既有单例(prisma/state/payoff helper),不引入新的抽象层;
- 不改变 `CHAPTER_ARTIFACT_CONSUMERS` 顺序与同步结果字段。

## 4. 验证

- server build;
- 定向 `chapterArtifactDialogue`、`chapterArtifactInfluence`、`chapterRuntime*`、`payoffLedger*`;
- server 全量套件;
- client 未动。

## 5. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 服务文件从 1302 降至约 950 行,纯工具与伏笔消费者各有明确归属,全部既有测试通过。

## 6. 后续

RF-1 剩余 4 个文件:`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`。
