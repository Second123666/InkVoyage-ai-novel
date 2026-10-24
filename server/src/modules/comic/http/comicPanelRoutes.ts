import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { comicPanelScriptService } from "./comicRouteContext";
import {
  assetIdParams,
  sceneIdParams,
  idParams,
  episodeIdParams,
  panelIdParams,
  charIdParams,
  charSheetVersionParams,
  factIdParams,
  createProjectSchema,
  styleUpdateSchema,
  presetUpdateSchema,
  generateOutlineSchema,
  sourceTextSchema,
  generateScriptSchema,
  visualPromptSchema,
  dialoguesSchema,
  excludedReferenceImageUrlsSchema,
  imageGenerateSchema,
} from "./comicRouteSchemas";

// 分镜脚本路由(拆分自 comicRoutes.ts,RF-1)。
export function registerComicPanelRoutes(router: Router): void {
// ─── Panels ─────────────────────────────────────────────────────────────────

router.get("/episodes/:episodeId/panels", validate({ params: episodeIdParams }), async (req, res, next) => {
  try {
    const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
    const data = await comicPanelScriptService.getPanels(episodeId);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.post(
  "/episodes/:episodeId/generate-script",
  validate({ params: episodeIdParams, body: generateScriptSchema }),
  async (req, res, next) => {
    try {
      const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
      const body = (req.body ?? {}) as z.infer<typeof generateScriptSchema>;
      const { provider, ...scriptInput } = body ?? {};
      const data = await comicPanelScriptService.generatePanelScript(
        episodeId,
        scriptInput,
        provider as Parameters<typeof comicPanelScriptService.generatePanelScript>[2],
      );
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.get("/panels/:panelId", validate({ params: panelIdParams }), async (req, res, next) => {
  try {
    const { panelId } = req.params as z.infer<typeof panelIdParams>;
    const data = await comicPanelScriptService.getPanel(panelId);
    if (!data) {
      res.status(404).json({ success: false, error: "漫画格子不存在。" } satisfies ApiResponse<null>);
      return;
    }
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.patch(
  "/panels/:panelId/visual-prompt",
  validate({ params: panelIdParams, body: visualPromptSchema }),
  async (req, res, next) => {
    try {
      const { panelId } = req.params as z.infer<typeof panelIdParams>;
      const { visualPrompt } = req.body as z.infer<typeof visualPromptSchema>;
      const data = await comicPanelScriptService.updatePanelVisualPrompt(panelId, visualPrompt);
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.patch(
  "/panels/:panelId/dialogues",
  validate({ params: panelIdParams, body: dialoguesSchema }),
  async (req, res, next) => {
    try {
      const { panelId } = req.params as z.infer<typeof panelIdParams>;
      const { dialogues } = req.body as z.infer<typeof dialoguesSchema>;
      const data = await comicPanelScriptService.updatePanelDialogues(panelId, dialogues);
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);
}
