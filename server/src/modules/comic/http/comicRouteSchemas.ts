import { z } from "zod";

// comic HTTP 共享参数与请求体 Schema(拆分自 comicRoutes.ts,RF-1)。
// ─── Param schemas ─────────────────────────────────────────────────────────

export const assetIdParams = z.object({ assetId: z.string().trim().min(1) });
export const sceneIdParams = z.object({ sceneId: z.string().trim().min(1) });
export const idParams = z.object({ id: z.string().trim().min(1) });
export const episodeIdParams = z.object({ episodeId: z.string().trim().min(1) });
export const panelIdParams = z.object({ panelId: z.string().trim().min(1) });
export const charIdParams = z.object({ charId: z.string().trim().min(1) });
export const charSheetVersionParams = z.object({ charId: z.string().trim().min(1), version: z.coerce.number().int().min(1) });
export const factIdParams = z.object({ factId: z.string().trim().min(1) });

// ─── Request body schemas ─────────────────────────────────────────────────

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sourceType: z.enum(["novel_import", "original", "text_import", "comic_import"]),
  sourceRef: z.string().trim().min(1).optional(),
  trackId: z.string().trim().max(40).optional(),
  inspiration: z.string().trim().max(4000).optional(),
  rawText: z.string().trim().max(200000).optional(),
  stylePreset: z.string().trim().max(1000).optional(),
});

export const styleUpdateSchema = z.object({
  style: z.string().trim().min(1).max(120),
});

export const presetUpdateSchema = z.object({
  format: z.string().trim().min(1).max(60).optional(),
  style: z.string().trim().max(120).optional(),
  promptKeywords: z.string().trim().max(400).optional(),
  imageSize: z.string().trim().max(20).optional(),
});

export const generateOutlineSchema = z
  .object({
    startOrder: z.number().int().min(1).optional(),
    count: z.number().int().min(1).max(40).optional(),
    provider: z.string().trim().optional(),
  })
  .optional();

export const sourceTextSchema = z.object({
  sourceText: z.string().max(50000),
});

export const generateScriptSchema = z
  .object({
    targetPanelCount: z.number().int().min(10).max(80).optional(),
    densityMode: z.enum(["relaxed", "balanced", "compact"]).optional(),
    scriptPromptInstruction: z.string().trim().max(1000).optional(),
    refreshSourceText: z.boolean().optional(),
    provider: z.string().trim().optional(),
  })
  .optional();

export const visualPromptSchema = z.object({
  visualPrompt: z.string().trim().min(1).max(400),
});

export const dialoguesSchema = z.object({
  dialogues: z.array(z.unknown()).max(3),
});

export const excludedReferenceImageUrlsSchema = z.array(z.string().trim().min(1).max(1000)).max(24).optional();

export const imageGenerateSchema = z
  .object({
    provider: z.string().trim().optional(),
    promptOverride: z.string().trim().max(4000).optional(),
    providerOverride: z.string().trim().optional(),
    sizeOverride: z.string().trim().max(20).optional(),
    negativePromptOverride: z.string().trim().max(2000).optional(),
    excludedReferenceImageUrls: excludedReferenceImageUrlsSchema,
  })
  .optional();
