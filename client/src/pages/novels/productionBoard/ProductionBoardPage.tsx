import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getNovelVolumeWorkspace, getSimpleCreationShelf } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildProductionBoardModel, CHAPTER_STATUS_META } from "./productionBoardModel";

// INN-C2 生产看板:章节状态、质量债务热点与卷进度一屏总览(复用既有投影,不新增后端契约)。
const TONE_CLASS: Record<string, string> = {
  muted: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
};

export default function ProductionBoardPage() {
  const { id = "" } = useParams();
  const shelfQuery = useQuery({
    queryKey: queryKeys.novels.simpleShelf(id),
    queryFn: () => getSimpleCreationShelf(id),
    enabled: Boolean(id),
  });
  const volumeQuery = useQuery({
    queryKey: queryKeys.novels.volumeWorkspace(id),
    queryFn: () => getNovelVolumeWorkspace(id),
    enabled: Boolean(id),
  });
  const shelf = shelfQuery.data?.data ?? null;
  const volumes = volumeQuery.data?.data?.volumes;
  const model = useMemo(() => (shelf ? buildProductionBoardModel({
    chapters: shelf.chapters,
    volumes: (volumes ?? []).map((volume) => ({
      id: volume.id,
      sortOrder: volume.sortOrder,
      title: volume.title,
      chapters: volume.chapters ?? [],
    })),
  }) : null), [shelf, volumes]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-1">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
          <Link to={`/novels/${id}/edit`}><ArrowLeft className="mr-1 h-4 w-4" />返回小说工作区</Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">生产看板</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          一屏查看这本书的章节状态、需要处理的章节、质量债务热点与各卷进度;点击条目可直接进入对应章节。
        </p>
      </div>

      {shelfQuery.isLoading ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
          正在汇总生产状态…
        </div>
      ) : shelfQuery.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
          <span>看板读取失败,请稍后重试。</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void shelfQuery.refetch()}>重试</Button>
        </div>
      ) : model && model.totalChapters > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">完成 {Math.round(model.completionRatio * 100)}%</Badge>
            <Badge variant="outline">章节 {model.totalChapters}</Badge>
            <Badge variant="outline">字数 {model.totalWordCount.toLocaleString("zh-CN")}</Badge>
            {model.attentionChapters.length > 0 ? (
              <Badge variant="destructive">待处理 {model.attentionChapters.length}</Badge>
            ) : (
              <Badge variant="outline">暂无待处理章节</Badge>
            )}
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link to={`/novels/${id}/edit`}>回到工作区<ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>

          <section className="rounded-xl bg-muted/20 p-4">
            <div className="mb-3 text-sm font-medium text-foreground">章节状态分布</div>
            <div className="space-y-2">
              {model.statusCounts.map((item) => (
                <div key={item.status} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 text-muted-foreground">{item.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", CHAPTER_STATUS_META[item.status].tone === "success" ? "bg-success" : CHAPTER_STATUS_META[item.status].tone === "warning" ? "bg-warning" : CHAPTER_STATUS_META[item.status].tone === "destructive" ? "bg-destructive" : CHAPTER_STATUS_META[item.status].tone === "info" ? "bg-info" : "bg-muted-foreground/40")}
                      style={{ width: `${model.totalChapters > 0 ? Math.round((item.count / model.totalChapters) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-foreground">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium text-foreground">需要处理的章节</div>
              {model.attentionChapters.length === 0 ? (
                <div className="text-xs text-muted-foreground">当前没有失败、待重规划或质量修复中的章节。</div>
              ) : (
                <div className="space-y-2">
                  {model.attentionChapters.slice(0, 8).map((chapter) => (
                    <Link
                      key={chapter.id}
                      to={`/novels/${id}/chapters/${chapter.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-xs hover:bg-muted/40"
                    >
                      <span className="truncate text-foreground">第 {chapter.order} 章 · {chapter.title}</span>
                      <span className={cn("shrink-0 rounded px-1.5 py-0.5", TONE_CLASS[CHAPTER_STATUS_META[chapter.status].tone])}>
                        {chapter.label}
                      </span>
                    </Link>
                  ))}
                  {model.attentionChapters.length > 8 ? (
                    <div className="text-xs text-muted-foreground">还有 {model.attentionChapters.length - 8} 章待处理。</div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="rounded-xl bg-muted/20 p-4">
              <div className="mb-3 text-sm font-medium text-foreground">质量债务热点</div>
              {model.debtHotspots.length === 0 ? (
                <div className="text-xs text-muted-foreground">当前没有记录中的质量债务。</div>
              ) : (
                <div className="space-y-2">
                  {model.debtHotspots.map((hotspot) => (
                    <Link
                      key={hotspot.chapterId}
                      to={`/novels/${id}/chapters/${hotspot.chapterId}`}
                      className="block rounded-lg bg-background px-3 py-2 text-xs hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-foreground">第 {hotspot.order} 章 · {hotspot.title}</span>
                        <Badge variant="outline" className="shrink-0">{hotspot.issueCodes.length} 项</Badge>
                      </div>
                      <div className="mt-1 line-clamp-1 text-muted-foreground">{hotspot.reason || "已记录质量债务"}</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-xl bg-muted/20 p-4">
            <div className="mb-3 text-sm font-medium text-foreground">卷进度</div>
            {volumeQuery.isLoading ? (
              <div className="text-xs text-muted-foreground">正在读取卷进度…</div>
            ) : volumeQuery.isError ? (
              <div className="text-xs text-muted-foreground">卷进度读取失败,章节状态与其他区块不受影响。</div>
            ) : model.volumeProgress.length === 0 ? (
              <div className="text-xs text-muted-foreground">还没有卷规划,先在工作区完成卷战略与卷骨架。</div>
            ) : (
              <div className="space-y-3">
                {model.volumeProgress.map((volume) => (
                  <div key={volume.volumeId} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-foreground">第 {model.volumeProgress.indexOf(volume) + 1} 卷 · {volume.title}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {volume.completedChapters}/{volume.totalChapters} 完成
                        {volume.attentionChapters > 0 ? ` · ${volume.attentionChapters} 待处理` : ""}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-success" style={{ width: `${Math.round(volume.ratio * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {model.unassignedChapterCount > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    另有 {model.unassignedChapterCount} 章未挂在卷计划中。
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm leading-7 text-muted-foreground">
          这本书还没有章节。先在工作区完成开书与章节规划,再回来看生产看板。
        </div>
      )}
    </div>
  );
}
