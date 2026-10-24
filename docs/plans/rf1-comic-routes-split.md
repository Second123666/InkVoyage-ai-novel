# LOOP-24 计划 · RF-1 第五个文件:`comicRoutes.ts`

更新:2026-10-24
状态:进行中
配套:BACKLOG RF-1 / RF-2

## 1. 现状审计

`server/src/modules/comic/http/comicRoutes.ts` 1071 行,单文件注册 64 条路由,覆盖:项目/剧集/设定事实、分镜脚本、角色与立绘、分镜图片与气泡、成片导出、批量任务、角色资产、场景。所有参数/请求体 Schema 与三个 `new` 服务实例也在同一文件。该文件是 RF-1 清单成员,同时也对应 RF-2(comicRoutes HTTP 层拆分)的目标。

## 2. 拆分方案(行为不变)

目录 `server/src/modules/comic/http/`:

- `comicRouteSchemas.ts`:共享参数与请求体 Schema;
- `comicRouteContext.ts`:共享服务实例(`ComicProjectService` / `ComicEpisodePlanService` / `ComicPanelScriptService`);
- 8 个领域注册器(每文件一个 `registerXxx(router)` 函数,路由代码原样搬运):
  - `comicProjectRoutes.ts` 项目/剧集/事实;
  - `comicPanelRoutes.ts` 分镜脚本;
  - `comicCharacterRoutes.ts` 角色与立绘;
  - `comicRenderRoutes.ts` 分镜图片与气泡;
  - `comicExportRoutes.ts` 成片导出;
  - `comicBatchRoutes.ts` 批量任务;
  - `comicCharacterAssetRoutes.ts` 角色资产;
  - `comicSceneRoutes.ts` 场景;
- `comicRoutes.ts`:入口文件,按**原注册顺序**依次调用注册器,保持 `export default router`。

## 3. 拆分原则

- 路由路径、方法、校验、处理函数体逐行搬运,不改任何业务逻辑;
- 注册顺序保持原文件顺序,避免匹配优先级变化;
- 服务实例仍为模块级单例(移入 context 文件),不引入依赖注入;
- 领域内专用 Schema 留在各自注册器文件,仅跨文件共享的进 schemas 文件;
- 入口文件不再包含路由定义,只做拼装。

## 4. 验证

- server build;
- 路由数量守卫:HEAD 64 条 vs 拆分后 8 文件合计 64 条;
- `comicDecoupling.test.js`(低耦合守卫);
- server 全量套件。

## 5. 验收对照

RF-1「一次拆一个;测试守护行为不变」= 入口文件降为 23 行,单文件均低于 300 行,路由数量与注册顺序不变,全量测试通过。RF-2「comicRoutes HTTP 层拆分」同轮达成。

## 6. 后续

RF-1 剩余 3 个文件:`promptRunner.ts`(1264)、`RagIndexService.ts`(1242)、`novelDirectorTakeover.ts`(1158)。
