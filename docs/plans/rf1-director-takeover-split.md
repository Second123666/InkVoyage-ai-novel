# LOOP-25 计划 · RF-1 第六个文件:`novelDirectorTakeover.ts`

更新:2026-10-24
状态:进行中
配套:BACKLOG RF-1

## 1. 现状审计

`server/src/services/novel/director/runtime/novelDirectorTakeover.ts` 1158 行,是导演接管的决策/就绪模块(纯函数,无 IO)。文件混杂:

1. 共享类型与阶段/入口元信息;
2. 种子素材判定与接管构思/候选构建;
3. 资产快照就绪谓词;
4. 阶段/入口/工作流阶段映射与跳步;
5. 接管计划解析(阶段计划 / 自动执行计划);
6. 各步骤就绪评估与预览;
7. 接管书目规格。

调用方(导演服务、恢复、执行、重置)均从 `./novelDirectorTakeover` 导入。

## 2. 拆分方案(行为不变)

目录 `server/src/services/novel/director/runtime/novelDirectorTakeover/`:

- `takeoverTypes.ts`:共享类型 + 阶段/入口元信息;
- `takeoverInput.ts`:种子素材判定、构思与候选、`buildDirectorTakeoverInput`;
- `takeoverSnapshot.ts`:资产快照就绪谓词;
- `takeoverMapping.ts`:阶段/入口/工作流映射与 `buildSkipSteps`;
- `takeoverPlan.ts`:执行延续判定、阶段计划、自动执行计划、`resolveDirectorTakeoverPlan`;
- `takeoverReadiness.ts`:各步骤就绪度、预览、`buildDirectorTakeoverReadiness`、`assertDirectorTakeoverPhaseAvailable`;
- `takeoverBookSpec.ts`:`buildTakeoverBookSpec`;
- `index.ts`:显式门面,只导出原公共 API。

原文件保留兼容门面。依赖方向:`types ← snapshot/input/mapping ← plan ← readiness`;`input ← bookSpec`。无循环。

## 3. 拆分原则

- 只移动代码、补充导入导出;不改任何判断阈值、文案、跳步语义与计划解析逻辑;
- 门面只导出原公共 API,内部谓词与元信息不外泄;
- 不引入依赖注入或状态;保持纯函数。

## 4. 验证

- server build;
- 定向 `novelDirectorTakeover*` 与 `directorTakeoverExecutionContract`;
- server 全量套件。

## 5. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 原文件降为 3 行门面,子模块均低于 450 行,全部既有测试通过。

## 6. 后续

RF-1 剩余 2 个文件:`promptRunner.ts`(1264)、`RagIndexService.ts`(1242)。
