# 漫画 HTTP 层模块边界(Comic HTTP Module)

## 背景

漫画(实验特性)的 HTTP 层原先是单个 1071 行文件,64 条路由与全部 Schema、服务实例混在一起。虽然该特性已降级为实验,HTTP 层仍需遵守项目的大文件拆分规则(RF-1),且 RF-2 明确要求拆分 comicRoutes HTTP 层。

## 决策

按领域把路由拆成注册器函数,入口文件只负责按原顺序拼装。行为不变:路由路径、方法、校验、处理函数体逐行搬运,注册顺序保持一致。

## 当前规则

1. **目录与职责**
   - `comicRoutes.ts`:入口,仅按顺序调用各注册器,保持 `export default router`;
   - `comicRouteSchemas.ts`:跨领域共享的参数与请求体 Schema;
   - `comicRouteContext.ts`:模块级服务单例(`ComicProjectService` / `ComicEpisodePlanService` / `ComicPanelScriptService`);
   - 8 个领域注册器(`comicProjectRoutes` / `comicPanelRoutes` / `comicCharacterRoutes` / `comicRenderRoutes` / `comicExportRoutes` / `comicBatchRoutes` / `comicCharacterAssetRoutes` / `comicSceneRoutes`):每个导出一个 `registerXxx(router)` 函数,内部路由代码原样搬运。
2. **注册顺序**:入口必须按原文件顺序调用注册器;新增路由时放在所属注册器内,不改全局顺序语义。
3. **Schema 归属**:领域内专用 Schema 留在注册器文件;只有跨领域共享的才进 `comicRouteSchemas.ts`。
4. **服务实例**:模块级 `new` 实例只允许出现在 `comicRouteContext.ts`;注册器从 context 取用,保持单例语义。
5. **低耦合约束**:`services/comic` 仍是独立 bounded context,不得依赖 novel/drama 领域(由 `comicDecoupling.test.js` 守护);HTTP 层的拆分不得改变这一边界。
6. **路由守卫**:新增/修改路由后,确认路由注册数量与预期一致;拆分轮次应保证总数与拆分前一致(64 条)。

## 失败模式

- **路由匹配变化**:某条路由在拆分后行为不同,检查入口的注册器调用顺序是否与原文件一致。
- **服务实例重复**:注册器内直接 `new` 服务而不是从 context 取,导致与原单例语义不一致。
- **Schema 重复定义**:同一 Schema 既在 schemas 文件又在注册器内定义;以单一来源为准,另一侧 import。
- **漫画特性回归**:漫画已降级为实验特性,该模块的改动不得影响主链;主链页面与路由不引用 `modules/comic/http` 内部文件。

## 相关模块

- `server/src/modules/comic/http/comicRoutes.ts`(入口)
- `server/src/modules/comic/http/`(领域注册器)
- `server/src/services/comic/`(漫画服务,bounded context)
- `server/tests/comicDecoupling.test.js`(低耦合守卫)
- `docs/plans/rf1-comic-routes-split.md`
