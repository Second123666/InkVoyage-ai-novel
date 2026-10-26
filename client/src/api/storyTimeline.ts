import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { StoryTimelineOverview } from "@ai-novel/shared/types/timeline";
import { apiClient } from "./client";

// UI-7:小说级故事时间线(只读投影,渲染层在客户端按需加载)。
export async function getStoryTimeline(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<StoryTimelineOverview>>(`/story-timeline/${novelId}`);
  return data;
}
