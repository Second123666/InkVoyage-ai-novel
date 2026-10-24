# LOOP-21 计划 · RF-1 第二个文件:`worldVisualization.ts`

更新:2026-10-23
状态:进行中
配套:BACKLOG RF-1

## 1. 现状审计

`server/src/services/world/worldVisualization.ts` 1082 行,混合了:

1. 类型、上限常量、方向/区域/路线枚举与势力类型别名;
2. 文本/JSON 工具与节点标签归一化;
3. 势力图:节点/边推断、自由文本势力抽取、力量层级、时间线;
4. 地理图:方向、坐标、区域、路线归一化与地图构建;
5. 载荷编排:结构化优先、自由文本兜底、LLM 草稿清洗、公共入口。

测试 `worldVisualization.test.js` 覆盖结构化优先、中文势力类型、时间线与地理兜底。

## 2. 拆分方案(行为不变)

目录 `server/src/services/world/worldVisualization/`:

- `worldVisualization.shared.ts`:类型、上限常量、`DIRECTION_COORDINATES`、`FACTION_TYPE_ALIASES`、`EDGE_RELATION_LABELS`、文本/JSON 工具、`makeId`/`normalizeTextField`;
- `worldVisualization.faction.ts`:势力节点/边推断与归一化、自由文本势力抽取、力量层级、时间线;
- `worldVisualization.geography.ts`:方向/坐标/区域/路线归一化、地理节点/边归一化、地理地图构建;
- `worldVisualization.payload.ts`:结构化载荷、兜底载荷、LLM 草稿、清洗与公共入口;
- `index.ts`:显式门面,仅导出原公共 API(`buildWorldVisualizationPayload`、`buildFallbackWorldVisualizationPayload`)。

原 `worldVisualization.ts` 保留兼容门面。依赖方向:`shared ← faction`、`shared ← geography`、`faction/geography/shared ← payload`,无循环。

## 3. 拆分原则

只移动代码并补跨文件导入导出;不修改推断规则、上限、排序与兜底顺序;内部工具不通过门面暴露。

## 4. 验证

- server build;
- `worldVisualization.test.js` 定向测试;
- `storyWorldSlice.test.js`、`worldStructure.test.js`、`bookFraming.test.js` 关联回归;
- server 全量套件。

## 5. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 原文件降为门面,职责文件均低于 400 行,全部既有测试通过。

## 6. 后续

RF-1 剩余 6 个文件:`world.prompts.ts`、`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`。
