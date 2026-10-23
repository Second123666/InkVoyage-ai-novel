# 世界结构化数据模块边界(World Structure Module)

## 背景

`worldStructure` 承担世界结构化数据的构造、归一化、旧字段兼容与投影。原实现位于单个 1311 行文件,超过项目 1300 行硬阈值,且同时混合了工具、归一化、旧数据迁移与投影职责,修改任意一层都需要在同一文件内跳转。

## 决策

按职责拆入 `server/src/services/world/worldStructure/`,原 `worldStructure.ts` 保留为兼容门面。拆分只做代码移动与导入导出调整,不改变函数体与公共 API。

## 当前规则

1. **目录与职责**
   - `worldStructure.shared.ts`:常量 `WORLD_STRUCTURE_SCHEMA_VERSION`、`WorldStructureSource`、JSON/文本/ID/去重/规则文本工具、空结构构造器;
   - `worldStructure.normalize.ts`:结构化数据归一化与 `parseWorldStructurePayload`;
   - `worldStructure.legacy.ts`:旧字段种子生成、旧字段文本构建、`applyStructuredWorldToLegacyFields`、`buildWorldStructureOverview`(总览消费旧字段文本构建器,放在 legacy 以避免循环);
   - `worldStructure.projection.ts`:仅 `buildWorldBindingSupport`;
   - `index.ts`:显式门面,只导出原公共 API。
2. **依赖方向**:`shared ← normalize ← legacy`;`shared ← projection`;`legacy → projection`(仅 apply 默认参数)。禁止 projection/normalize 反向依赖 legacy;总览等同时依赖旧字段文本的逻辑必须放在 legacy,不能放 projection。
3. **外部消费**:其它模块继续从 `server/src/services/world/worldStructure.ts` 导入;不要在业务代码里深引用 `worldStructure/` 内部文件。
4. **拆分原则**:移动代码时不得改函数体、默认值、排序或返回结构;新增跨文件引用需显式 import/export,不使用 `export *` 暴露内部工具。
5. **测试守护**:`worldStructure.test.js`、`worldVisualization.test.js`、`storyWorldSlice.test.js`、`bookFraming.test.js` 必须在拆分后保持通过。

## 失败模式

- **编译报"X is not exported"**:检查跨文件使用的工具是否在 `shared`/`normalize` 中导出;门面只导出公共 API,内部工具不应通过门面暴露。
- **重复声明**:拆分时同一函数被切进两个文件;以职责归属为准,删除重复副本并从所属文件导入。
- **循环依赖**:若 legacy 与 projection 互相 import,说明投影逻辑被错误放进 legacy;`applyStructuredWorldToLegacyFields` 只允许单向依赖 projection。
- **外部深引用**:发现业务代码直接 import `worldStructure/worldStructure.normalize` 时,改回门面导入。

## 相关模块

- `server/src/services/world/worldStructure.ts`(兼容门面)
- `server/src/services/world/worldStructure/`(职责子模块)
- `server/src/services/world/worldVisualization.ts`(图谱投影消费方)
- `server/tests/worldStructure.test.js` 等(行为守卫)
- `docs/plans/rf1-world-structure-split.md`(本轮拆分计划)
