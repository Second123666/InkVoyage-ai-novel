import type { StoryTimelineOverview } from "@ai-novel/shared/types/timeline";
import { timelineRepository, type TimelineRepository } from "./timeline.repository";

// UI-7 故事时间线:小说级只读投影(事件 + 伏笔 + 截断统计),供客户端时间轴渲染。
type StoryTimelineRepository = Pick<TimelineRepository, "listEventsForNovel" | "listHooksForNovel">;

export async function buildStoryTimelineOverview(
  novelId: string,
  repository: StoryTimelineRepository = timelineRepository,
): Promise<StoryTimelineOverview> {
  const [events, hooks] = await Promise.all([
    repository.listEventsForNovel({ novelId }),
    repository.listHooksForNovel({ novelId }),
  ]);

  return {
    events: events.items,
    hooks: hooks.items,
    stats: {
      eventCount: events.items.length,
      hookCount: hooks.items.length,
      eventsTruncated: events.truncated,
      hooksTruncated: hooks.truncated,
    },
  };
}
