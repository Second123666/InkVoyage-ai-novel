import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import {
  chapterGenerationTraceService,
  type ChapterGenerationTraceRecord,
} from "../services/novel/runtime/chapterGenerationTraceService";

// INN-B1 只读轨迹查询:按章节返回最近若干条生成轨迹(上下文装配/模型/审核/验收决策)。
export const chapterTraceRouter = Router();

chapterTraceRouter.get("/:novelId/:chapterId", async (req, res, next) => {
  try {
    const traces = await chapterGenerationTraceService.list(
      req.params.novelId,
      req.params.chapterId,
    );
    res.status(200).json({
      success: true,
      data: { traces },
      message: "Chapter generation traces loaded.",
    } satisfies ApiResponse<{ traces: ChapterGenerationTraceRecord[] }>);
  } catch (error) {
    next(error);
  }
});
