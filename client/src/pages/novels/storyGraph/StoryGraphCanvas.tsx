import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  StoryGraphNodeKind,
  StoryWorldGraphPayload,
} from "@ai-novel/shared/types/storyWorldGraph";
import { cn } from "@/lib/utils";
import { computeStoryGraphLayout } from "./storyGraphLayout";

// INN-C1 故事世界图谱画布:React Flow 渲染层,由页面按需懒加载。
const KIND_STYLES: Record<StoryGraphNodeKind, string> = {
  character: "border-primary/40 bg-primary/10",
  faction: "border-warning/40 bg-warning/10",
  location: "border-info/40 bg-info/10",
  element: "border-border bg-muted/60",
};

const KIND_LABELS: Record<StoryGraphNodeKind, string> = {
  character: "角色",
  faction: "势力",
  location: "地点",
  element: "要素",
};

export default function StoryGraphCanvas({ data }: { data: StoryWorldGraphPayload }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const layout = useMemo(() => computeStoryGraphLayout(data.nodes), [data.nodes]);
  const initialNodes = useMemo<Node[]>(() => data.nodes.map((node) => ({
    id: node.id,
    position: layout[node.id] ?? { x: 0, y: 0 },
    data: { label: node.label },
    className: cn(
      "rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground !shadow-none",
      KIND_STYLES[node.kind],
    ),
    draggable: true,
  })), [data.nodes, layout]);
  const [flowNodes, , onNodesChange] = useNodesState(initialNodes);

  const flowEdges = useMemo<Edge[]>(() => data.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: edge.kind === "character_relation",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "hsl(var(--muted-foreground) / 0.45)" },
    labelStyle: { fontSize: 10 },
    labelBgStyle: { fill: "hsl(var(--background) / 0.85)" },
  })), [data.edges]);

  const selectedNode = selectedNodeId
    ? data.nodes.find((node) => node.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="space-y-3">
      <div className="story-graph-canvas h-[560px] overflow-hidden rounded-xl bg-muted/20">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          fitView
          minZoom={0.2}
          onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {(Object.entries(KIND_LABELS) as Array<[StoryGraphNodeKind, string]>).map(([kind, label]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full border", KIND_STYLES[kind])} />
            {label}
          </span>
        ))}
        <span>节点可拖动;点击节点查看详情,点击空白处收起。</span>
      </div>

      {selectedNode ? (
        <div className="rounded-lg border bg-background p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{selectedNode.label}</span>
            <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              {KIND_LABELS[selectedNode.kind]}
            </span>
          </div>
          {selectedNode.summary ? (
            <div className="mt-1.5 text-xs leading-6 text-muted-foreground">{selectedNode.summary}</div>
          ) : null}
          {selectedNode.meta && Object.keys(selectedNode.meta).length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {Object.entries(selectedNode.meta)
                .filter(([, value]) => Boolean(value))
                .map(([key, value]) => (
                  <span key={key} className="rounded bg-muted/50 px-1.5 py-0.5">{key}: {value}</span>
                ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
