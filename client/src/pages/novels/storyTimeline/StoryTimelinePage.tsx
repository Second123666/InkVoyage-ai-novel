import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Flag } from "lucide-react";
import { getStoryTimeline } from "@/api/storyTimeline";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StoryTimelineEvent } from "@ai-novel/shared/types/timeline";
import { TIMELINE_STATUS_META } from "./storyTimelineLayout";

const StoryTimelineCanvas = lazy(() => import("./StoryTimelineCanvas"));

// UI-7 故事时间线:章节时间轴 + 伏笔生命周期,数据来自只读投影端点,画布按需懒加载。
const STATUS_FILTERS: Array<{ value: "all" | StoryTimelineEvent["status"]; label: string }> = [
  { value: "all", label: "全部" },
  { value: "occurred", label: "已发生" },
  { value: "foreshadowed", label: "铺垫中" },
  { value: "planned", label: "计划中" },
  { value: "resolved", label: "已回收" },
  { value: "cancelled", label: "已取消" },
  { value: "superseded", label: "已替换" },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "紧急",
};

export default function StoryTimelinePage() {
  const { id = "" } = useParams();
  const [statusFilter, setStatusFilter] = useState<"all" | StoryTimelineEvent["status"]>("all");
  const timelineQuery = useQuery({
    queryKey: queryKeys.novels.storyTimeline(id),
    queryFn: () => getStoryTimeline(id),
    enabled: Boolean(id),
  });
  const data = timelineQuery.data?.data ?? null;

  const events = useMemo(
    () => (data?.events ?? []).filter((event) => statusFilter === "all" || event.status === statusFilter),
    [data, statusFilter],
  );
  const openHooks = useMemo(
    () => (data?.hooks ?? [])
      .filter((hook) => hook.status === "open" || hook.status === "addressed")
      .sort((left, right) => {
        const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityRank[left.priority] ?? 9) - (priorityRank[right.priority] ?? 9)
          || left.createdInChapterIndex - right.createdInChapterIndex;
      }),
    [data],
  );
  const maxChapterIndex = useMemo(
    () => (data?.events ?? []).reduce(
      (max, event) => (typeof event.chapterIndex === "number" ? Math.max(max, event.chapterIndex) : max),
      0,
    ),
    [data],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
            <Link to={`/novels/${id}/edit`}><ArrowLeft className="mr-1 h-4 w-4" />返回小说工作区</Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">故事时间线</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            按章节查看已发生、铺垫中的故事事件及其前后影响,并跟踪伏笔的回收进度。时间线会随正文生成持续补充。
          </p>
        </div>
        {data ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">事件 {data.stats.eventCount}</Badge>
            <Badge variant={openHooks.length > 0 ? "secondary" : "outline"}>未回收伏笔 {openHooks.length}</Badge>
            {data.stats.eventsTruncated ? <Badge variant="secondary">事件较多,仅展示最近一部分</Badge> : null}
          </div>
        ) : null}
      </div>

      {timelineQuery.isLoading ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
          正在读取故事时间线…
        </div>
      ) : timelineQuery.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
          <span>故事时间线读取失败,请稍后重试。</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void timelineQuery.refetch()}>重试</Button>
        </div>
      ) : !data || data.events.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm leading-7 text-muted-foreground">
          这本书还没有时间线事件。完成章节生成后,系统会从正文中提取事件、状态变化与伏笔,补充到时间线。
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  statusFilter === filter.value
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40",
                )}
              >
                {filter.label}
              </button>
            ))}
            <span className="text-xs text-muted-foreground">当前 {events.length} 个事件</span>
          </div>

          {events.length === 0 ? (
            <div className="rounded-xl bg-muted/20 p-6 text-sm text-muted-foreground">
              当前筛选下没有事件,切换到「全部」查看完整时间线。
            </div>
          ) : (
            <Suspense fallback={<div className="rounded-xl bg-muted/20 p-4 text-xs text-muted-foreground">正在加载时间线画布…</div>}>
              <StoryTimelineCanvas events={events} />
            </Suspense>
          )}

          <section className="rounded-xl bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Flag className="h-4 w-4" aria-hidden="true" />
              未回收伏笔
            </div>
            {openHooks.length === 0 ? (
              <div className="text-xs text-muted-foreground">当前没有待回收的伏笔。</div>
            ) : (
              <div className="space-y-2">
                {openHooks.map((hook) => {
                  const overdue = typeof hook.expectedResolveByChapterIndex === "number"
                    && hook.expectedResolveByChapterIndex <= maxChapterIndex;
                  return (
                    <div key={hook.id} className="rounded-lg bg-background px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-foreground">{hook.title}</span>
                        <Badge variant="outline">优先级 {PRIORITY_LABELS[hook.priority] ?? hook.priority}</Badge>
                        {overdue ? <Badge variant="destructive">已到期未回收</Badge> : null}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{hook.description}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        埋设于第 {hook.createdInChapterIndex} 章
                        {typeof hook.expectedResolveByChapterIndex === "number"
                          ? ` · 预计第 ${hook.expectedResolveByChapterIndex} 章前回收`
                          : " · 长期伏笔"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
