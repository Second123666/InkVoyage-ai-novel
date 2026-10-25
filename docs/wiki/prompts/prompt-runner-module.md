# 提示词执行器模块边界(Prompt Runner Module)

## 背景

`promptRunner.ts` 是所有 PromptAsset 的执行入口:文本执行、结构化执行(含 JSON 修复/语义重试)、流式执行与遥测记录。原文件 1264 行,同时承载可覆盖测试注入点、纯工具、遥测与执行器。拆分属于 RF-1 大文件治理。

## 决策

按职责拆入 `prompting/core/promptRunner/`,原文件保留兼容门面。**门面必须使用显式 `export const` 重导出,不得使用 `export *`** —— 这是本模块最重要的契约。

## 当前规则

1. **模块划分**
   - `promptRunnerState.ts`:可覆盖 LLM 工厂/结构化调用器状态、访问器、测试注入函数;
   - `promptRunnerHelpers.ts`:纯工具(渲染上下文、调用元信息、错误分类、语义重试消息);
   - `promptRunnerTelemetry.ts`:完成/失败记录、流式捕获、运行结果组装;
   - `promptRunnerStructured.ts`:结构化解析、后校验、语义重试循环;
   - `promptRunnerExecutors.ts`:执行准备与四个执行器;
   - `index.ts`:显式门面,只导出原公共 API。
2. **可写导出门面**:既有大量测试用 `promptRunner.runStructuredPrompt = stub` 就地替换导出来注入桩。`export *` 的 CJS 产物是 getter 绑定(不可写),赋值静默失败会导致桩失效、真实 LLM 调用被触发。门面一律 `export const x = internals.x`(可写属性)。
3. **测试注入方式**:代码内注入统一使用 `setPromptRunnerLLMFactoryForTests` / `setPromptRunnerStructuredInvokerForTests`(单例状态,访问器共享)。
4. **依赖方向**:`state/helpers ← telemetry ← structured ← executors`。禁止反向依赖;executors 是唯一组合层。
5. **执行语义**:重试阈值、修复次数、遥测事件名是外部契约(质量遥测、trace 记录依赖),拆分与演进都不得改变。

## 失败模式

- **测试桩静默失效**:症状是测试中出现真实 LLM 调用日志(`[structured.invoke] invoke_start ... baseURL=https://api...`)或错误信息与桩预期不符;检查门面是否被改回 `export *`。
- **语义重试不生效**:检查 `promptRunnerStructured.ts` 的重试循环是否仍通过 `getPromptRunnerStructuredInvoker()` 取调用器(而不是捕获初值)。
- **循环依赖**:helpers/telemetry 不得 import executors;新增引用时先确认方向。
- **注册键与资产版本不一致**:历史上多个注册键落后于资产实际版本(水合时键被重映射,旧键失效)。BUG-9 已把 8 个键对齐到资产版本并让 `prompting.test.js` 恢复全绿;新增提示词时注册键必须与资产 `id@version` 完全一致,可用全量扫描脚本(遍历 `promptAssetLoaderEntries` 校验 `id@version === key`)在 CI 前自查。

## 相关模块

- `server/src/prompting/core/promptRunner.ts`(兼容门面)
- `server/src/prompting/core/promptRunner/`(职责子模块)
- `server/src/prompting/registry.ts`(资产注册与水合)
- `server/src/prompting/core/promptQualityTelemetry.ts`(质量遥测)
- `server/tests/chapterPatchRepair.test.js`(桩注入回归守卫)
- `docs/plans/rf1-prompt-runner-split.md`
