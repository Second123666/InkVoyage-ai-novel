import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { StoryWorldGraphPayload } from "@ai-novel/shared/types/storyWorldGraph";
import { apiClient } from "./client";

// INN-C1:小说级故事世界图谱(只读投影,渲染层在客户端)。
export async function getStoryWorldGraph(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<StoryWorldGraphPayload>>(`/story-graph/${novelId}`);
  return data;
}
