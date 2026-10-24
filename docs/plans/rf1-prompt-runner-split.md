# LOOP-27 计划 · RF-1 第八个文件:`promptRunner.ts`(最后一个)

更新:2026-10-24
状态:进行中
配套:BACKLOG RF-1

## 1. 现状审计

`server/src/prompting/core/promptRunner.ts` 1264 行,是提示词资产的执行核心。文件混杂:

1. 可覆盖的 LLM 工厂与结构化调用器(测试注入点);
2. 纯工具:渲染上下文、调用元信息、错误分类、语义重试消息;
3. 遥测:完成/失败记录、流式输出捕获、运行结果组装;
4. 结构化输出解析、后校验与语义重试循环;
5. 执行器:文本/结构化/流式执行与执行准备。

该文件是 RF-1 清单最后一个 >1000 行文件。

## 2. 拆分方案(行为不变)

目录 `server/src/prompting/core/promptRunner/`:

- `promptRunnerState.ts`:可覆盖工厂/调用器状态、访问器与测试注入函数;
- `promptRunnerHelpers.ts`:纯工具函数;
- `promptRunnerTelemetry.ts`:完成/失败记录、流式捕获、结果组装;
- `promptRunnerStructured.ts`:结构化解析、后校验、语义重试;
- `promptRunnerExecutors.ts`:执行准备与四个执行器;
- `index.ts`:显式门面,只导出原公共 API。

原 `promptRunner.ts` 保留兼容门面。

## 3. 关键陷阱(本轮核心教训)

既有测试用**就地赋值**注入桩:`promptRunner.runStructuredPrompt = async () => ...`。
`export *` 重导出在 CJS 产物中是 **getter 绑定(不可写)**,赋值静默失败,测试桩失效,真实 LLM 调用被触发,多个测试以完全不同的错误信息失败。

**修复**:门面不用 `export *`,改用显式 `export const x = internals.x`(TS CJS 产物为可写属性),保证就地替换继续生效。

## 4. 拆分原则

- 只移动代码、补充导入导出;不改任何执行语义、重试阈值、遥测事件;
- 门面保持公共 API 与**可写导出属性**;
- 内部状态模块不外泄;`index` 显式导出。

## 5. 验证

- server build;
- 定向 `chapterPatchRepair`(桩注入回归)与 prompt 系列;
- server 全量套件;
- stash 对照:确认 `chapterPatchRepair` 在 HEAD 通过、在未修复的拆分上失败,证明根因归属。

## 6. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 原文件降为门面,子模块均低于 640 行,全量测试通过,RF-1 整项完成(8/8)。

## 7. 后续

RF-1 清单清空。剩余大文件阈值内。下一步按 BACKLOG 顺序进入 BUG/UI/OPS。
