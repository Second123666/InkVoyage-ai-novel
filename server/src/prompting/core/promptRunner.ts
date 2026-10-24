// promptRunner 兼容门面:实现拆分到 ./promptRunner/ 责任模块(RF-1)。
// 使用显式 export const 而非 export *,保证导出属性可写:
// 既有测试会就地替换 promptRunner.runStructuredPrompt 等导出来注入桩,
// export * 的 getter 绑定会让这类替换静默失效。
import {
  preparePromptExecution as preparePromptExecutionImpl,
  runStructuredPrompt as runStructuredPromptImpl,
  runTextPrompt as runTextPromptImpl,
  streamStructuredPrompt as streamStructuredPromptImpl,
  streamTextPrompt as streamTextPromptImpl,
} from "./promptRunner/index";
import {
  setPromptRunnerLLMFactoryForTests as setPromptRunnerLLMFactoryForTestsImpl,
  setPromptRunnerStructuredInvokerForTests as setPromptRunnerStructuredInvokerForTestsImpl,
} from "./promptRunner/index";

export const preparePromptExecution = preparePromptExecutionImpl;
export const runStructuredPrompt = runStructuredPromptImpl;
export const runTextPrompt = runTextPromptImpl;
export const streamStructuredPrompt = streamStructuredPromptImpl;
export const streamTextPrompt = streamTextPromptImpl;
export const setPromptRunnerLLMFactoryForTests = setPromptRunnerLLMFactoryForTestsImpl;
export const setPromptRunnerStructuredInvokerForTests = setPromptRunnerStructuredInvokerForTestsImpl;
