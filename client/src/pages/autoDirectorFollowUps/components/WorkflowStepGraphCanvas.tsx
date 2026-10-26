import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import {
  buildWorkflowStepGraphModel,
  resolveHighlightedStepIds,
  WORKFLOW_STEP_NODE_HEIGHT,
  WORKFLOW_STEP_NODE_WIDTH,
} from "../workflowStepGraphLayout";

// UI-7 自动导演工作流步骤图:React Flow 渲染层,由导演跟进页按需懒加载。
interface WorkflowStepGraphCanvasProps {
  highlightCheckpoint?: string | null;
  highlightStage?: string | null;
}

export default function WorkflowStepGraphCanvas({
  highlightCheckpoint = null,
  highlightStage = null,
}: WorkflowStepGraphCanvasProps) {
  const graph = useMemo(() => buildWorkflowStepGraphModel(), []);
  const highlightedIds = useMemo(
    () => new Set(resolveHighlightedStepIds({ checkpoint: highlightCheckpoint, stage: highlightStage })),
    [highlightCheckpoint, highlightStage],
  );

  const nodes = useMemo<Node[]>(
    () => graph.nodes.map((node) => ({
      id: node.id,
      position: { x: node.x, y: node.y },
      data: {
        label: (
          <div className="space-y-0.5 text-left">
            <div className="text-xs font-medium leading-4 text-foreground">{node.label}</div>
            <div className="text-[10px] leading-4 text-muted-foreground">{node.stageLabel}</div>
          </div>
        ),
      },
      className: cn(
        "rounded-lg border bg-background px-3 py-2 !shadow-none",
        highlightedIds.has(node.id)
          ? "border-primary ring-2 ring-primary/30"
          : "border-border",
      ),
      style: { width: WORKFLOW_STEP_NODE_WIDTH, height: WORKFLOW_STEP_NODE_HEIGHT },
    })),
    [graph, highlightedIds],
  );

  const edges = useMemo<Edge[]>(
    () => graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
      style: { stroke: "hsl(var(--muted-foreground) / 0.4)" },
    })),
    [graph],
  );

  return (
    <div className="h-[440px] overflow-hidden rounded-xl bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.15}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
