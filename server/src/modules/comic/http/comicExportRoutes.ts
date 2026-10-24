import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { comicExportService } from "../../../services/comic/ComicExportService";
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

// 剧集成片导出路由(拆分自 comicRoutes.ts,RF-1)。
export function registerComicExportRoutes(router: Router): void {
// ─── Export ────────────────────────────────────────────────────────────────────

const exportEpisodeSchema = z.object({
  format: z.enum(["long_image", "sliced"]).optional(),
  spec: z.object({
    sliceWidth: z.number().int().min(400).max(2048).optional(),
    sliceMaxHeight: z.number().int().min(0).max(100000).optional(),
    outputFormat: z.enum(["png", "jpg", "webp"]).optional(),
    quality: z.number().int().min(1).max(100).optional(),
  }).optional(),
});

const exportJobIdParams = z.object({ jobId: z.string().trim().min(1) });
const artifactParams = z.object({
  jobId: z.string().trim().min(1),
  filename: z.string().trim().min(1),
});

router.post(
  "/episodes/:episodeId/export",
  validate({ params: episodeIdParams, body: exportEpisodeSchema }),
  async (req, res, next) => {
    try {
      const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
      const body = req.body as z.infer<typeof exportEpisodeSchema>;
      const data = await comicExportService.exportEpisode(episodeId, body?.format, body?.spec);
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.get("/projects/:id/export-jobs", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    const data = await comicExportService.listExportJobs(id);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.get("/export-jobs/:jobId", validate({ params: exportJobIdParams }), async (req, res, next) => {
  try {
    const { jobId } = req.params as z.infer<typeof exportJobIdParams>;
    const data = await comicExportService.getExportJob(jobId);
    if (!data) {
      res.status(404).json({ success: false, error: "导出任务不存在。" } satisfies ApiResponse<null>);
      return;
    }
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.get(
  "/export-jobs/:jobId/artifacts/:filename",
  validate({ params: artifactParams }),
  async (req, res, next) => {
    try {
      const { jobId, filename } = req.params as z.infer<typeof artifactParams>;
      const file = await comicExportService.getArtifactFile(jobId, filename);
      if (!file) {
        res.status(404).json({ success: false, error: "产物文件不存在。" } satisfies ApiResponse<null>);
        return;
      }
      const mimeMap: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
      res.setHeader("Content-Type", mimeMap[file.ext] ?? "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(file.buffer);
    } catch (err) { next(err); }
  },
);
}
