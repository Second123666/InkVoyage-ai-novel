# 导演接管模块边界(Director Takeover Module)

## 背景

导演接管的"从哪一步继续、跳过哪些步骤、给用户什么预览"由 `novelDirectorTakeover.ts` 以纯函数决策。原文件 1158 行,把类型、元信息、就绪谓词、计划解析、就绪预览混在一起,任何一处调整都要在大文件内跳转;且该文件属于 RF-1 大文件清单。

## 决策

按职责拆入 `runtime/novelDirectorTakeover/`,原文件保留兼容门面。行为保持不变:判断阈值、文案、跳步语义、计划解析逻辑逐行搬运。

## 当前规则

1. **模块划分**
   - `takeoverTypes.ts`:共享类型 + 阶段/入口元信息;
   - `takeoverInput.ts`:种子素材判定、构思/候选构建、`buildDirectorTakeoverInput`;
   - `takeoverSnapshot.ts`:资产快照就绪谓词(纯布尔判断);
   - `takeoverMapping.ts`:阶段/入口/工作流映射与 `buildSkipSteps`;
   - `takeoverPlan.ts`:执行延续判定、阶段计划、自动执行计划、`resolveDirectorTakeoverPlan`;
   - `takeoverReadiness.ts`:各步骤就绪度、预览、`buildDirectorTakeoverReadiness`、`assertDirectorTakeoverPhaseAvailable`;
   - `takeoverBookSpec.ts`:`buildTakeoverBookSpec`;
   - `index.ts`:显式门面,只导出原公共 API。
2. **依赖方向**:`types ← snapshot/input/mapping ← plan ← readiness`;`input ← bookSpec`。禁止 readiness 被 plan 反向依赖;新增跨模块引用时确认方向。
3. **外部消费**:导演服务/恢复/执行/重置继续从 `runtime/novelDirectorTakeover.ts` 导入;不要深引用内部文件。
4. **纯函数约束**:本模块不得引入 prisma、LLM 或可变状态;需要 IO 的逻辑放到 runtime/execution 等相邻模块。
5. **公共 API**:`index.ts` 只导出 4 个接口与 10 个函数;内部谓词与元信息不外泄,`export *` 不用于 index。

## 失败模式

- **跳步语义变化**:修改 `buildSkipSteps` 或映射表时,必须与 `novelDirectorTakeoverExecution` 的恢复路径一起回归。
- **就绪判断错位**:就绪谓词只读快照字段,不得引入 IO;若需要 IO,放到调用方组装快照。
- **循环依赖**:readiness 不得被 plan import;新增引用时先确认方向。
- **文案漂移**:阶段/入口元信息的 label/description 是用户可见文案,修改需同步检查 `DirectorTakeoverReadService` 与前端预览。

## 相关模块

- `server/src/services/novel/director/runtime/novelDirectorTakeover.ts`(兼容门面)
- `server/src/services/novel/director/runtime/novelDirectorTakeover/`(职责子模块)
- `server/src/services/novel/director/recovery/DirectorTakeoverReadService.ts`
- `server/src/services/novel/director/runtime/novelDirectorTakeoverExecution.ts`
- `server/tests/novelDirectorTakeover.test.js`
- `docs/plans/rf1-director-takeover-split.md`
