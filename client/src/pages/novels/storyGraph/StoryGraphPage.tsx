import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getStoryWorldGraph } from "@/api/storyGraph";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const StoryGraphCanvas = lazy(() => import("./StoryGraphCanvas"));

// INN-C1 故事世界图谱页:数据来自只读投影端点,画布按需懒加载(零首屏增量)。
export default function StoryGraphPage() {
  const { id = "" } = useParams();
  const graphQuery = useQuery({
    queryKey: queryKeys.novels.storyGraph(id),
    queryFn: () => getStoryWorldGraph(id),
    enabled: Boolean(id),
  });
  const data = graphQuery.data?.data ?? null;
  const hasNodes = Boolean(data && data.nodes.length > 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground">
            <Link to={`/novels/${id}/edit`}><ArrowLeft className="mr-1 h-4 w-4" />返回小说工作区</Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">故事世界图谱</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            按这本书聚合角色、势力与地点的关系全貌。节点可拖动,点击可查看摘要;数据来自世界切片、角色关系阶段与势力轨迹。
          </p>
        </div>
        {data ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">角色 {data.stats.characterCount}</Badge>
            <Badge variant="outline">势力 {data.stats.factionCount}</Badge>
            <Badge variant="outline">地点 {data.stats.locationCount}</Badge>
            {data.stats.elementCount > 0 ? <Badge variant="outline">要素 {data.stats.elementCount}</Badge> : null}
            <Badge variant="secondary">关系 {data.stats.edgeCount}</Badge>
          </div>
        ) : null}
      </div>

      {graphQuery.isLoading ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
          正在整理这本书的关系图谱…
        </div>
      ) : graphQuery.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
          <span>图谱读取失败,请稍后重试。</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void graphQuery.refetch()}>重试</Button>
        </div>
      ) : !hasNodes ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm leading-7 text-muted-foreground">
          这本书还没有可成图的角色与势力数据。先完成开书与角色准备,或到小说工作区生成世界切片后回来查看。
        </div>
      ) : data ? (
        <>
          {data.coverage.hasSlice ? null : (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">
              世界切片还未生成,势力与地点可能偏少;在小说工作区刷新世界切片后图谱会更完整。
            </div>
          )}
          <Suspense fallback={(
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-sm text-muted-foreground">
              正在加载图谱画布…
            </div>
          )}>
            <StoryGraphCanvas key={data.generatedAt} data={data} />
          </Suspense>
        </>
      ) : null}
    </div>
  );
}
