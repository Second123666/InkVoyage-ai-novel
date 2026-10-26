import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { StoryTimelineEvent } from "@ai-novel/shared/types/timeline";
import { cn } from "@/lib/utils";
import {
  buildStoryTimelineGraph,
  TIMELINE_NODE_HEIGHT,
  TIMELINE_NODE_WIDTH,
  TIMELINE_SOURCE_LABELS,
  TIMELINE_STATUS_META,
  TIMELINE_TYPE_LABELS,
  TIMELINE_VISIBILITY_LABELS,
} from "./storyTimelineLayout";

// UI-7 故事时间线画布:React Flow 渲染层,由页面按需懒加载。
const STATUS_STYLES: Record<string, string> = {
  success: "border-success/40 bg-success/10",
  info: "border-info/40 bg-info/10",
  warning: "border-warning/40 bg-warning/10",
  muted: "border-border bg-muted/60",
};

export default function StoryTimelineCanvas({ events }: { events: StoryTimelineEvent[] }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const graph = useMemo(() => buildStoryTimelineGraph(events), [events]);

  const nodes = useMemo<Node[]>(
    () => graph.nodes.map((node) => ({
      id: node.id,
      position: { x: node.x, y: node.y },
      data: {
        label: (
          <div className="space-y-0.5 text-left">
            <div className="line-clamp-1 text-xs font-medium leading-4 text-foreground">{node.title}</div>
            <div className="text-[10px] leading-4 text-muted-foreground">
              {node.chapterLabel} · {TIMELINE_TYPE_LABELS[node.type]} · {TIMELINE_STATUS_META[node.status].label}
            </div>
          </div>
        ),
      },
      className: cn(
        "rounded-lg border bg-background px-3 py-2 !shadow-none",
        STATUS_STYLES[TIMELINE_STATUS_META[node.status].tone] ?? STATUS_STYLES.muted,
        selectedNodeId === node.id && "ring-2 ring-primary/30",
      ),
      style: { width: TIMELINE_NODE_WIDTH, height: TIMELINE_NODE_HEIGHT },
    })),
    [graph, selectedNodeId],
  );

  const edges = useMemo<Edge[]>(
    () => graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: edge.kind === "prerequisite"
        ? { stroke: "hsl(var(--muted-foreground) / 0.35)", strokeDasharray: "4 4" }
        : { stroke: "hsl(var(--primary) / 0.35)" },
    })),
    [graph],
  );

  const selectedEvent = selectedNodeId
    ? events.find((event) => event.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="space-y-3">
      <div className="h-[520px] overflow-hidden rounded-xl bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.15}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>节点按章节从左到右排列,虚线表示前置事件,实线表示后续影响。</span>
        <span>点击节点查看事件详情;点击空白处收起。</span>
      </div>

      {selectedEvent ? (
        <div className="rounded-lg border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{selectedEvent.title}</span>
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              {TIMELINE_TYPE_LABELS[selectedEvent.type]} · {TIMELINE_STATUS_META[selectedEvent.status].label}
            </span>
            {selectedEvent.storyTimeLabel ? (
              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                {selectedEvent.storyTimeLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-xs leading-6 text-muted-foreground">{selectedEvent.summary || "暂无摘要。"}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded bg-muted/50 px-1.5 py-0.5">
              {typeof selectedEvent.chapterIndex === "number" ? `第 ${selectedEvent.chapterIndex} 章` : "未挂章"}
            </span>
            <span className="rounded bg-muted/50 px-1.5 py-0.5">{TIMELINE_VISIBILITY_LABELS[selectedEvent.visibility]}</span>
            <span className="rounded bg-muted/50 px-1.5 py-0.5">来源: {TIMELINE_SOURCE_LABELS[selectedEvent.source]}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
