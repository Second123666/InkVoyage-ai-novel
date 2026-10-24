# 世界可视化模块边界(World Visualization Module)

## 背景

世界可视化负责把结构化世界数据或自由文本转成势力图、地理图、力量层级与时间线。原实现集中在 1082 行的单个文件,同时包含常量、文本解析、势力推断、地理归一化与载荷编排,任何改动都需要跨越大段无关代码。

## 决策

按职责拆入 `server/src/services/world/worldVisualization/`,原文件保留兼容门面。拆分只做代码移动与导入导出调整,不改变推断规则与兜底顺序。

## 当前规则

1. **目录与职责**
   - `worldVisualization.shared.ts`:类型、上限常量、方向坐标、势力类型别名、关系标签、文本/JSON 工具;
   - `worldVisualization.faction.ts`:势力节点/边推断与归一化、自由文本势力抽取、力量层级、时间线;
   - `worldVisualization.geography.ts`:方向/坐标/区域/路线归一化、地理节点/边归一化与地图构建;
   - `worldVisualization.payload.ts`:结构化载荷、自由文本兜底、LLM 草稿清洗、公共入口;
   - `index.ts`:显式门面,仅导出 `buildWorldVisualizationPayload` 与 `buildFallbackWorldVisualizationPayload`。
2. **依赖方向**:`shared ← faction`、`shared ← geography`、`faction/geography/shared ← payload`。禁止 faction 与 geography 互相依赖;跨域共享的常量/工具只能放 shared。
3. **外部消费**:其它模块继续从 `server/src/services/world/worldVisualization.ts` 导入;不要深引用 `worldVisualization/` 内部文件。
4. **行为约束**:结构化优先于自由文本兜底;LLM 草稿必须经过 `sanitizeVisualizationPayload`,节点/边上限不变;拆分不得调整兜底顺序。
5. **测试守护**:`worldVisualization.test.js` 必须保持通过,并覆盖结构化优先、中文势力类型、时间线与地理兜底。

## 失败模式

- **编译报未导出**:跨文件使用的工具需在 shared/faction/geography 中显式 `export`;门面只导出公共 API。
- **循环依赖**:若 faction 与 geography 互相 import,说明共享逻辑放错层,应上移到 shared。
- **可视化结果顺序变化**:检查是否在拆分时改动了 `.slice()` 上限或兜底顺序;本模块只允许移动代码。
- **LLM 草稿绕过清洗**:公共入口必须先尝试结构化载荷,再兜底 + LLM 草稿,最后必须经 sanitize。

## 相关模块

- `server/src/services/world/worldVisualization.ts`(兼容门面)
- `server/src/services/world/worldVisualization/`(职责子模块)
- `server/src/services/world/worldStructure.ts`(结构化世界数据来源)
- `server/src/prompting/prompts/world/world.prompts.ts`(可视化提示词资产)
- `server/tests/worldVisualization.test.js`
- `docs/plans/rf1-world-visualization-split.md`
