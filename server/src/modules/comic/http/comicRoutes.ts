import { Router } from "express";
import { registerComicProjectRoutes } from "./comicProjectRoutes";
import { registerComicPanelRoutes } from "./comicPanelRoutes";
import { registerComicCharacterRoutes } from "./comicCharacterRoutes";
import { registerComicRenderRoutes } from "./comicRenderRoutes";
import { registerComicExportRoutes } from "./comicExportRoutes";
import { registerComicBatchRoutes } from "./comicBatchRoutes";
import { registerComicCharacterAssetRoutes } from "./comicCharacterAssetRoutes";
import { registerComicSceneRoutes } from "./comicSceneRoutes";

// comic HTTP 路由入口:按原文件注册顺序拼装各领域注册器(拆分自单文件,RF-1)。
const router = Router();

registerComicProjectRoutes(router);
registerComicPanelRoutes(router);
registerComicCharacterRoutes(router);
registerComicRenderRoutes(router);
registerComicExportRoutes(router);
registerComicBatchRoutes(router);
registerComicCharacterAssetRoutes(router);
registerComicSceneRoutes(router);

export default router;
