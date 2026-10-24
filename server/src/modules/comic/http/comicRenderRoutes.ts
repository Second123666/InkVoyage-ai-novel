import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { comicPanelImageService } from "../../../services/comic/ComicPanelImageService";
import { comicBubbleLayoutService } from "../../../services/comic/ComicBubbleLayoutService";
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

// 分镜图片与对白气泡路由(拆分自 comicRoutes.ts,RF-1)。
export function registerComicRenderRoutes(router: Router): void {
// ─── Panel images ──────────────────────────────────────────────────────────

router.post(
  "/panels/:panelId/image/prepare",
  validate({ params: panelIdParams, body: imageGenerateSchema }),
  async (req, res, next) => {
    try {
      const { panelId } = req.params as z.infer<typeof panelIdParams>;
      const body = (req.body ?? {}) as z.infer<typeof imageGenerateSchema>;
      const data = await comicPanelImageService.preparePanelImage(
        panelId,
        body?.provider as Parameters<typeof comicPanelImageService.preparePanelImage>[1] | undefined,
      );
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.post(
  "/panels/:panelId/image/generate",
  validate({ params: panelIdParams, body: imageGenerateSchema }),
  async (req, res, next) => {
    try {
      const { panelId } = req.params as z.infer<typeof panelIdParams>;
      const body = (req.body ?? {}) as z.infer<typeof imageGenerateSchema>;
      const data = await comicPanelImageService.generatePanelImage(
        panelId,
        body?.provider as Parameters<typeof comicPanelImageService.generatePanelImage>[1] | undefined,
        {
          promptOverride: body?.promptOverride,
          providerOverride: body?.providerOverride,
          sizeOverride: body?.sizeOverride as never,
          negativePromptOverride: body?.negativePromptOverride,
          excludedReferenceImageUrls: body?.excludedReferenceImageUrls,
        },
      );
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.get("/panels/:panelId/image", validate({ params: panelIdParams }), async (req, res, next) => {
  try {
    const { panelId } = req.params as z.infer<typeof panelIdParams>;
    const data = await comicPanelImageService.getPanelImageData(panelId);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

// 图片文件服务（供前端 <img src> 使用）
router.get("/panel-images/:panelId/panel", validate({ params: panelIdParams }), async (req, res, next) => {
  try {
    const { panelId } = req.params as z.infer<typeof panelIdParams>;
    const file = await comicPanelImageService.getPanelImageFile(panelId);
    if (!file) {
      res.status(404).json({ success: false, error: "图片尚未生成。" } satisfies ApiResponse<null>);
      return;
    }
    const mimeMap: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
    res.setHeader("Content-Type", mimeMap[file.ext] ?? "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(file.buffer);
  } catch (err) { next(err); }
});

// ─── Bubble lettering ─────────────────────────────────────────────────────────

const letterPanelSchema = z
  .object({
    bubbleOpacity: z.number().min(0).max(1).optional(),
    maxBubbleWidthRatio: z.number().min(0.2).max(0.8).optional(),
  })
  .optional();

router.post(
  "/panels/:panelId/letter",
  validate({ params: panelIdParams, body: letterPanelSchema }),
  async (req, res, next) => {
    try {
      const { panelId } = req.params as z.infer<typeof panelIdParams>;
      const opts = (req.body ?? {}) as z.infer<typeof letterPanelSchema>;
      const result = await comicBubbleLayoutService.letterPanel(panelId, opts ?? {});
      res.json({
        success: true,
        data: { url: `/api/comic/panel-images/${panelId}/lettered`, width: result.width, height: result.height },
      } satisfies ApiResponse<{ url: string; width: number; height: number }>);
    } catch (err) { next(err); }
  },
);

router.get("/panel-images/:panelId/lettered", validate({ params: panelIdParams }), async (req, res, next) => {
  try {
    const { panelId } = req.params as z.infer<typeof panelIdParams>;
    const buf = await comicBubbleLayoutService.getLetteredImageFile(panelId);
    if (!buf) {
      res.status(404).json({ success: false, error: "排版图尚未生成。" } satisfies ApiResponse<null>);
      return;
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) { next(err); }
});
}
