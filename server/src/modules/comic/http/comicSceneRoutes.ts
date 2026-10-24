import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { z } from "zod";
import { validate } from "../../../middleware/validate";
import { comicSceneService } from "../../../services/comic/ComicSceneService";
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

// 场景与场景图路由(拆分自 comicRoutes.ts,RF-1)。
export function registerComicSceneRoutes(router: Router): void {
// ─── Scenes ───────────────────────────────────────────────────────────────────

const sceneBibleSchema = z.object({
  palette: z.string().trim().max(120).optional(),
  keyElements: z.string().trim().max(200).optional(),
  materials: z.string().trim().max(120).optional(),
  ambiance: z.string().trim().max(120).optional(),
  layout: z.string().trim().max(160).optional(),
});

const createSceneSchema = z.object({
  projectId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(60),
  sceneType: z.enum(["interior", "exterior", "landscape", "abstract", "other"]).optional(),
  bible: sceneBibleSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

const updateSceneSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  sceneType: z.enum(["interior", "exterior", "landscape", "abstract", "other"]).optional(),
  bible: sceneBibleSchema.optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

// 列出项目所有场景
router.get("/projects/:id/scenes", validate({ params: idParams }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParams>;
    const data = await comicSceneService.listByProject(id);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

// 创建场景
router.post("/scenes", validate({ body: createSceneSchema }), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSceneSchema>;
    const data = await comicSceneService.createScene(body);
    res.status(201).json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

// 更新场景（名称/类型/bible）
router.patch("/scenes/:sceneId", validate({ params: sceneIdParams, body: updateSceneSchema }), async (req, res, next) => {
  try {
    const { sceneId } = req.params as z.infer<typeof sceneIdParams>;
    const body = req.body as z.infer<typeof updateSceneSchema>;
    const data = await comicSceneService.updateScene(sceneId, body);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

// 删除场景
router.delete("/scenes/:sceneId", validate({ params: sceneIdParams }), async (req, res, next) => {
  try {
    const { sceneId } = req.params as z.infer<typeof sceneIdParams>;
    await comicSceneService.deleteScene(sceneId);
    res.json({ success: true, data: null } satisfies ApiResponse<null>);
  } catch (err) { next(err); }
});

// AI 生成场景设定图
router.post("/scenes/:sceneId/prepare-image", validate({ params: sceneIdParams, body: imageGenerateSchema }), async (req, res, next) => {
  try {
    const { sceneId } = req.params as z.infer<typeof sceneIdParams>;
    const body = (req.body ?? {}) as z.infer<typeof imageGenerateSchema>;
    const data = await comicSceneService.prepareSceneSheet(sceneId, body?.provider);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

router.post("/scenes/:sceneId/generate-image", validate({ params: sceneIdParams, body: imageGenerateSchema }), async (req, res, next) => {
  try {
    const { sceneId } = req.params as z.infer<typeof sceneIdParams>;
    const body = (req.body ?? {}) as z.infer<typeof imageGenerateSchema>;
    await comicSceneService.generateSceneSheet(sceneId, body?.provider, {
      promptOverride: body?.promptOverride,
      providerOverride: body?.providerOverride,
      sizeOverride: body?.sizeOverride as never,
      negativePromptOverride: body?.negativePromptOverride,
      excludedReferenceImageUrls: body?.excludedReferenceImageUrls,
    });
    const data = await comicSceneService.getScene(sceneId);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

// 上传场景设定图（Content-Type: image/* 直传）
router.post("/scenes/:sceneId/upload-image", validate({ params: sceneIdParams }), async (req, res, next) => {
  try {
    const { sceneId } = req.params as z.infer<typeof sceneIdParams>;
    const mimeType = req.headers["content-type"] ?? "image/png";
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const buffer = Buffer.concat(chunks);
    if (buffer.length === 0) throw new Error("未收到图片数据");
    const data = await comicSceneService.uploadSceneImage(sceneId, buffer, mimeType);
    res.json({ success: true, data } satisfies ApiResponse<typeof data>);
  } catch (err) { next(err); }
});

// 服务场景图文件
router.get("/scenes/:sceneId/image", validate({ params: sceneIdParams }), async (req, res, next) => {
  try {
    const { sceneId } = req.params as z.infer<typeof sceneIdParams>;
    const { filePath, mimeType } = await comicSceneService.serveSceneImage(sceneId);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const { createReadStream } = await import("fs");
    createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
});
}
