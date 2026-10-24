# LOOP-22 计划 · RF-1 第三个文件:`world.prompts.ts`

更新:2026-10-24
状态:进行中
配套:BACKLOG RF-1

## 1. 现状审计

`server/src/prompting/prompts/world/world.prompts.ts` 1312 行,包含 14 个 `PromptAsset` 与 3 个辅助函数。注册表与业务服务统一从该文件导入;文件同时覆盖参考灵感、概念卡、选项深挖、可视化、一致性、分层生成、导入抽取、结构回填、主题世界、结构分区与公理建议等不同任务。

## 2. 拆分方案(行为不变)

目录 `server/src/prompting/prompts/world/world.prompts/`:

- `worldReference.prompts.ts`:参考灵感、概念卡、概念卡本地化(3 个资产);
- `worldOptions.prompts.ts`:属性选项、深挖问题(2 个资产);
- `worldGeneration.prompts.ts`:分层生成/本地化、结构回填、主题世界、结构分区、公理建议(6 个资产)+ 分区载荷校验;
- `worldQuality.prompts.ts`:可视化、一致性、导入抽取(3 个资产);
- `worldPromptHelpers.ts`:参考方式标签与宽松对象清洗;
- `index.ts`:显式门面,导出原 14 个 PromptAsset。

原 `world.prompts.ts` 保留兼容门面 `export * from "./world.prompts/index"`;注册表 `promptAssetLoaderEntries.ts` 与业务导入路径不变。

## 3. 拆分原则

- 只移动资产定义与补导入导出,不修改 `id` / `version` / `taskType` / `mode` / `contextPolicy` / `outputSchema` / `render`;
- 辅助函数按使用范围归入 helpers;
- 新增世界提示词时放入对应家族文件并通过 index 导出,不再回到门面堆叠;
- 不改变 prompt 注册表加载方式与资产键。

## 4. 验证

- server build(覆盖全量 prompt 注册与类型);
- 定向 prompt 相关测试(`llmProviders`、prompt registry/schema 相关);
- server 全量套件;
- 空跑注册表加载,确认 14 个资产仍可解析。

## 5. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 原文件降为门面,家族文件均低于 600 行,14 个资产导出与注册不变,全部测试通过。

## 6. 后续

RF-1 剩余 5 个文件:`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`。
