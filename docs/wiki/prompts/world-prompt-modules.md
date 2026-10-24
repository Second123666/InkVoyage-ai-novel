# 世界提示词模块(World Prompt Modules)

## 背景

`world.prompts.ts` 曾同时承载 14 个世界提示词资产业务,文件超过 1300 行。提示词注册表与业务服务都从这一路径导入,直接移动文件会破坏注册与调用;同时新增世界提示词时缺少明确的家族归属。

## 决策

按任务家族拆入 `server/src/prompting/prompts/world/world.prompts/`,原文件保留兼容门面。拆分只做代码移动与导入导出调整,不修改任何资产定义。

## 当前规则

1. **家族划分**
   - `worldReference.prompts.ts`:参考灵感、概念卡、概念卡本地化;
   - `worldOptions.prompts.ts`:属性选项、深挖问题;
   - `worldGeneration.prompts.ts`:分层生成/本地化、结构回填、主题世界、结构分区、公理建议;
   - `worldQuality.prompts.ts`:可视化、一致性、导入抽取;
   - `worldPromptHelpers.ts`:参考方式标签、宽松对象清洗。
2. **公共入口**:注册表与业务继续从 `server/src/prompting/prompts/world/world.prompts.ts` 导入;该文件只做 `export * from "./world.prompts/index"`。
3. **新增提示词**:先判断家族,加入对应文件,并在 `world.prompts/index.ts` 显式导出;不得把新资产直接堆回门面或新建无归属的平铺文件。
4. **资产不可变**:拆分不得修改 `id`、`version`、`taskType`、`mode`、`contextPolicy`、`outputSchema`、`render`;注册表键与加载路径必须保持。
5. **辅助函数**:仅被单个家族使用的辅助留在该家族;跨家族共享的放入 `worldPromptHelpers.ts`,不得新建泛化 `utils`。

## 失败模式

- **注册表加载失败**:检查门面是否导出全部 14 个资产;注册表按名称 `require` 门面,不直接 require 家族文件。
- **提示词行为变化**:对比拆分前后 `render` 与 schema;任何“顺手优化”都超出 RF-1 范围,应另开轮次。
- **家族归属争议**:以任务语义为准(参考/选项/生成/质量),不要按调用方或页面归属。
- **重复定义**:同一资产被切进两个家族文件;以注册表键为准保留一份。

## 相关模块

- `server/src/prompting/prompts/world/world.prompts.ts`(兼容门面)
- `server/src/prompting/prompts/world/world.prompts/`(家族资产)
- `server/src/prompting/registry/promptAssetLoaderEntries.ts`(注册表加载)
- `server/src/prompting/prompts/world/world.promptTypes.ts`
- `server/src/prompting/prompts/world/world.promptSchemas.ts`
- `docs/plans/rf1-world-prompts-split.md`
