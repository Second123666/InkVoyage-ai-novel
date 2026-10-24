// worldVisualization 兼容门面:实现拆分到 ./worldVisualization/ 责任模块(RF-1)。
// 外部模块继续从本文件导入,避免深引用内部文件。
export * from "./worldVisualization/index";
