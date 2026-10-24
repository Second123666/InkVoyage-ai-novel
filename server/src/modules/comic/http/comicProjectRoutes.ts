import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { comicEpisodePlanService, comicProjectService } from "./comicRouteContext";
import { comicFactService } from "../../../services/comic/ComicFactService";
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

// 项目、剧集与设定事实路由(拆分自 comicRoutes.ts,RF-1)。
export function registerComicProjectRoutes(router: Router): void {
// ─── Projects ─────────────────────────────────────────────────────────────

router.get("/projects", async (_req, res, next) => {
  try {
    const data = await comicProjectService.listProjects();
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.post("/projects", validate({ body: createProjectSchema }), async (req, res, next) => {
  try {
    const data = await comicProjectService.createProject(req.body as z.infer<typeof createProjectSchema>);
    res.status(201).json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.get("/projects/:id", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    const data = await comicProjectService.getProject(id);
    if (!data) {
      res.status(404).json({ success: false, error: "漫画项目不存在。" } satisfies ApiResponse<null>);
      return;
    }
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.delete("/projects/:id", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    await comicProjectService.deleteProject(id);
    res.json({ success: true, data: null } satisfies ApiResponse<null>);
  } catch (err) { next(err); }
});

// ─── Source bundle ─────────────────────────────────────────────────────────

router.post("/projects/:id/source-bundle", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    const data = await comicProjectService.importSourceBundle(id);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

// ─── Style ─────────────────────────────────────────────────────────────────

router.patch(
  "/projects/:id/style",
  validate({ params: idParams, body: styleUpdateSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParams>;
      const { style } = req.body as z.infer<typeof styleUpdateSchema>;
      const data = await comicProjectService.updateProjectStyle(id, JSON.stringify({ style }));
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

// ─── Preset (format + style) ──────────────────────────────────────────────

router.patch(
  "/projects/:id/preset",
  validate({ params: idParams, body: presetUpdateSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParams>;
      const patch = req.body as z.infer<typeof presetUpdateSchema>;
      const data = await comicProjectService.updateProjectPreset(id, patch);
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

// ─── Episodes ─────────────────────────────────────────────────────────────

router.get("/projects/:id/episodes", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    const data = await comicEpisodePlanService.listEpisodes(id);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.post(
  "/projects/:id/episodes/generate-outline",
  validate({ params: idParams, body: generateOutlineSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParams>;
      const body = (req.body ?? {}) as z.infer<typeof generateOutlineSchema>;
      const { provider, ...planInput } = body ?? {};
      const data = await comicEpisodePlanService.generateOutline(
        id,
        planInput,
        provider as Parameters<typeof comicEpisodePlanService.generateOutline>[2],
      );
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

router.get("/episodes/:episodeId", validate({ params: episodeIdParams }), async (req, res, next) => {
  try {
    const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
    const data = await comicEpisodePlanService.getEpisode(episodeId);
    if (!data) {
      res.status(404).json({ success: false, error: "漫画话数不存在。" } satisfies ApiResponse<null>);
      return;
    }
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.patch(
  "/episodes/:episodeId/source-text",
  validate({ params: episodeIdParams, body: sourceTextSchema }),
  async (req, res, next) => {
    try {
      const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
      const { sourceText } = req.body as z.infer<typeof sourceTextSchema>;
      const data = await comicEpisodePlanService.updateEpisodeSourceText(episodeId, sourceText);
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

const updateEpisodeSchema = z.object({
  title: z.string().trim().max(30).optional(),
  outline: z.string().trim().max(1000).optional(),
  cliffhanger: z.string().trim().max(100).optional(),
  isPaywalled: z.boolean().optional(),
});

router.patch(
  "/episodes/:episodeId",
  validate({ params: episodeIdParams, body: updateEpisodeSchema }),
  async (req, res, next) => {
    try {
      const { episodeId } = req.params as z.infer<typeof episodeIdParams>;
      const patch = req.body as z.infer<typeof updateEpisodeSchema>;
      const data = await comicEpisodePlanService.updateEpisode(episodeId, patch);
      res.json({ success: true, data } satisfies ApiResponse<typeof data>);
    } catch (err) { next(err); }
  },
);

// ─── Facts ────────────────────────────────────────────────────────────────────

router.get("/projects/:id/facts", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    const data = await comicFactService.listFacts(id);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.delete("/facts/:factId", validate({ params: factIdParams }), async (req, res, next) => {
  try {
    const { factId } = req.params as z.infer<typeof factIdParams>;
    await comicFactService.deleteFact(factId);
    res.json({ success: true, data: null } satisfies ApiResponse<null>);
  } catch (err) { next(err); }
});
}
