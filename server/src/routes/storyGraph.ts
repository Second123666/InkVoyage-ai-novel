import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { StoryWorldGraphPayload } from "@ai-novel/shared/types/storyWorldGraph";
import { storyWorldGraphService } from "../services/novel/state/storyWorldGraph";

// INN-C1 只读故事世界图谱:按小说聚合 角色×势力×地点 的图谱投影。
export const storyGraphRouter = Router();

storyGraphRouter.get("/:novelId", async (req, res, next) => {
  try {
    const data = await storyWorldGraphService.build(String(req.params.novelId));
    res.status(200).json({
      success: true,
      data,
      message: "Story world graph loaded.",
    } satisfies ApiResponse<StoryWorldGraphPayload>);
  } catch (error) {
    next(error);
  }
});
