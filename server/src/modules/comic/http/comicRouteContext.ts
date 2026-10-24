import { ComicProjectService } from "../../../services/comic/ComicProjectService";
import { ComicEpisodePlanService } from "../../../services/comic/ComicEpisodePlanService";
import { ComicPanelScriptService } from "../../../services/comic/ComicPanelScriptService";

// comic 路由共享服务实例(拆分自 comicRoutes.ts,RF-1)。
// 各路由注册器从这里取实例,保证与原单文件运行时一致的单例语义。
export const comicProjectService = new ComicProjectService();
export const comicEpisodePlanService = new ComicEpisodePlanService();
export const comicPanelScriptService = new ComicPanelScriptService();
