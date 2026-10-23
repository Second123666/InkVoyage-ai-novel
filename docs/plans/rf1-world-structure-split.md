# LOOP-20 计划 · RF-1 大文件拆分(首个:`worldStructure.ts`)

更新:2026-10-23
状态:进行中
配套:BACKLOG RF-1

## 1. 现状审计

`server/src/services/world/worldStructure.ts` 1311 行,超过 1300 行硬阈值,职责混杂:

1. 共享常量/类型与 JSON、文本、ID、去重工具;
2. 空结构构造器与规则文本转换;
3. 结构化数据归一化(`normalizeWorldStructuredData` 等);
4. 旧字段兼容:从自由文本/旧 JSON 生成种子并回写旧字段;
5. 绑定支持与总览投影。

外部模块通过 `worldStructure` 深引用多个导出;测试 `worldStructure.test.js`、`worldVisualization.test.js`、`storyWorldSlice.test.js`、`bookFraming.test.js` 覆盖行为。

## 2. 拆分方案(行为不变)

目录 `server/src/services/world/worldStructure/`:

- `worldStructure.shared.ts`:常量、`WorldStructureSource` 类型、JSON/文本/ID/去重/规则文本工具、空结构构造器;
- `worldStructure.normalize.ts`:全部归一化函数 + `parseWorldStructurePayload`;
- `worldStructure.legacy.ts`:旧字段种子生成(`buildWorldStructureFromLegacySource` / `buildWorldStructureSeedFromSource`)、旧字段文本构建、`applyStructuredWorldToLegacyFields`、`buildWorldStructureOverview`(消费旧字段文本构建器);
- `worldStructure.projection.ts`:仅 `buildWorldBindingSupport`;
- `index.ts`:显式门面,只导出原公共 API。

原 `worldStructure.ts` 保留为一行兼容门面 `export * from "./worldStructure/index"`,外部导入路径不变,避免深引用内部文件。

依赖方向:`shared ← normalize ← legacy`;`shared ← projection`;`legacy → projection`(仅 `applyStructuredWorldToLegacyFields` 默认参数)。总览放到 legacy 以避免 `legacy ↔ projection` 循环。无循环依赖。

## 3. 拆分原则

- 只移动代码与补跨文件导出/导入,不改函数体、默认值、返回结构与排序;
- 公共 API 名称与签名保持不变;
- 内部工具保持模块内可见;门面不额外暴露内部工具;
- 不新增 `utils`/`shared` 泛化目录,文件归入既有 `world` 业务域下的 `worldStructure/` 子模块。

## 4. 验证

- server build;
- `worldStructure.test.js`、`worldVisualization.test.js`、`storyWorldSlice.test.js`、`bookFraming.test.js` 定向测试;
- server 全量套件(行为不变回归);
- client 未动沿用既往结论。

## 5. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 原文件降至门面 3 行,职责文件均低于 700 行(shared≈239、normalize≈466、legacy≈625、projection≈61),全部既有测试通过。

## 6. 后续

RF-1 剩余清单(下一轮选一个):`world.prompts.ts`、`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`worldVisualization.ts`、`comicRoutes.ts`。
