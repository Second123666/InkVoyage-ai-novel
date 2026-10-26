import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { StoryTimelineOverview } from "@ai-novel/shared/types/timeline";
import { buildStoryTimelineOverview } from "../storyTimelineOverview.service";

// UI-7 只读故事时间线:按小说返回全部时间线事件与伏笔生命周期。
export const storyTimelineRouter = Router();

storyTimelineRouter.get("/:novelId", async (req, res, next) => {
  try {
    const data = await buildStoryTimelineOverview(String(req.params.novelId));
    res.status(200).json({
      success: true,
      data,
      message: "Story timeline loaded.",
    } satisfies ApiResponse<StoryTimelineOverview>);
  } catch (error) {
    next(error);
  }
});
