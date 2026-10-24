// novelDirectorTakeover 兼容门面:实现拆分到 ./novelDirectorTakeover/ 责任模块(RF-1)。
// 导演服务与调用方继续从本文件导入,避免深引用内部文件。
export * from "./novelDirectorTakeover/index";
