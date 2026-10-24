// world.prompts 兼容门面:实现拆分到 ./world.prompts/ 责任模块(RF-1)。
// 提示词注册表与业务模块继续从本文件导入,避免深引用内部文件。
export * from "./world.prompts/index";
