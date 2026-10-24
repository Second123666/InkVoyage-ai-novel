import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { comicBatchOrchestrator } from "../../../services/comic/ComicBatchOrchestrator";
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

// 批量生成任务路由(拆分自 comicRoutes.ts,RF-1)。
export function registerComicBatchRoutes(router: Router): void {
// ─── Batch jobs ────────────────────────────────────────────────────────────────

const batchJobIdParams = z.object({ jobId: z.string().trim().min(1) });

const startBatchSchema = z
  .object({
    provider: z.string().trim().optional(),
    concurrency: z.number().int().min(1).max(10).optional(),
    skipDone: z.boolean().optional(),
  })
  .optional();

const retryBatchSchema = z.object({ provider: z.string().trim().optional() }).optional();

const estimateCostSchema = z.object({ provider: z.string().trim().optional() }).optional();

router.post(
  "/episodes/:episodeId/batch/start",
  validate({ params: episodeIdParams, body: startBatchSchema }),
  async (req, res, next) => {
    try {
      const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
      const body = (req.body ?? {}) as z.infer<typeof startBatchSchema>;
      const data = await comicBatchOrchestrator.startEpisodeBatch(episodeId, {
        provider: body?.provider as LLMProvider | undefined,
        concurrency: body?.concurrency,
        skipDone: body?.skipDone,
      });
      res.status(202).json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.post(
  "/batch-jobs/:jobId/retry",
  validate({ params: batchJobIdParams, body: retryBatchSchema }),
  async (req, res, next) => {
    try {
      const { jobId } = req.params as z.infer<typeof batchJobIdParams>;
      const body = (req.body ?? {}) as z.infer<typeof retryBatchSchema>;
      const data = await comicBatchOrchestrator.retryFailed(jobId, {
        provider: body?.provider as LLMProvider | undefined,
      });
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.get("/batch-jobs/:jobId", validate({ params: batchJobIdParams }), async (req, res, next) => {
  try {
    const { jobId } = req.params as z.infer<typeof batchJobIdParams>;
    const data = await comicBatchOrchestrator.getBatchJob(jobId);
    if (!data) {
      res.status(404).json({ success: false, error: "批量任务不存在。" } satisfies ApiResponse<null>);
      return;
    }
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.get("/projects/:id/batch-jobs", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    const data = await comicBatchOrchestrator.listBatchJobs(id);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.get(
  "/episodes/:episodeId/batch/estimate",
  validate({ params: episodeIdParams }),
  async (req, res, next) => {
    try {
      const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
      const provider = typeof req.query.provider === "string" ? req.query.provider : "openai";
      const data = await comicBatchOrchestrator.estimateCost(episodeId, provider);
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);
}
