import dagre from "dagre";
import {
  WORKFLOW_DISPLAY_STAGES,
  WORKFLOW_STEP_CATALOG,
  resolveWorkflowDisplayStage,
  type WorkflowStepCatalogDisplayStage,
} from "@ai-novel/shared/types/directorWorkflowStepCatalog";

// UI-7 自动导演工作流步骤图:基于 step catalog 的编排元数据生成确定性 DAG 布局。
export interface WorkflowStepGraphNode {
  id: string;
  label: string;
  stage: WorkflowStepCatalogDisplayStage;
  stageLabel: string;
  order: number;
  x: number;
  y: number;
}

export interface WorkflowStepGraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowStepGraphModel {
  nodes: WorkflowStepGraphNode[];
  edges: WorkflowStepGraphEdge[];
}

export const WORKFLOW_STEP_NODE_WIDTH = 176;
export const WORKFLOW_STEP_NODE_HEIGHT = 52;

const STAGE_LABELS = new Map(WORKFLOW_DISPLAY_STAGES.map((stage) => [stage.key, stage.label]));
const CATALOG_IDS = new Set(WORKFLOW_STEP_CATALOG.map((entry) => entry.id));

export function buildWorkflowStepGraphModel(): WorkflowStepGraphModel {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 28, ranksep: 64, marginx: 16, marginy: 16 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const entry of WORKFLOW_STEP_CATALOG) {
    graph.setNode(entry.id, { width: WORKFLOW_STEP_NODE_WIDTH, height: WORKFLOW_STEP_NODE_HEIGHT });
  }

  const edges: WorkflowStepGraphEdge[] = [];
  for (const entry of WORKFLOW_STEP_CATALOG) {
    for (const prerequisiteId of entry.prerequisiteStepIds ?? []) {
      if (!CATALOG_IDS.has(prerequisiteId)) {
        continue;
      }
      graph.setEdge(prerequisiteId, entry.id);
      edges.push({ id: `${prerequisiteId}->${entry.id}`, source: prerequisiteId, target: entry.id });
    }
  }

  dagre.layout(graph);

  const nodes = WORKFLOW_STEP_CATALOG
    .map((entry) => {
      const position = graph.node(entry.id);
      return {
        id: entry.id,
        label: entry.label,
        stage: entry.displayStage,
        stageLabel: STAGE_LABELS.get(entry.displayStage) ?? entry.displayStage,
        order: entry.orchestrationOrder ?? 0,
        x: position.x - WORKFLOW_STEP_NODE_WIDTH / 2,
        y: position.y - WORKFLOW_STEP_NODE_HEIGHT / 2,
      };
    })
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));

  return { nodes, edges };
}

export function resolveHighlightedStepIds(input: {
  checkpoint?: string | null;
  stage?: string | null;
}): string[] {
  const checkpoint = input.checkpoint?.trim() ?? "";
  if (checkpoint) {
    const byCheckpoint = WORKFLOW_STEP_CATALOG
      .filter((entry) => entry.checkpoint === checkpoint)
      .map((entry) => entry.id);
    if (byCheckpoint.length > 0) {
      return byCheckpoint;
    }
  }

  const stage = input.stage?.trim() ?? "";
  if (!stage) {
    return [];
  }
  const displayStage = resolveWorkflowDisplayStage({ currentStage: stage, checkpointType: checkpoint || null });
  return WORKFLOW_STEP_CATALOG
    .filter((entry) => entry.displayStage === displayStage)
    .map((entry) => entry.id);
}
