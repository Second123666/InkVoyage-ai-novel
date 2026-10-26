import type { StoryTimelineEvent } from "@ai-novel/shared/types/timeline";

// UI-7 故事时间线:按章节分列、事件按 eventOrder 排列的确定性时间轴布局。
export interface StoryTimelineGraphNode {
  id: string;
  title: string;
  summary: string;
  status: StoryTimelineEvent["status"];
  type: StoryTimelineEvent["type"];
  chapterIndex: number | null;
  chapterLabel: string;
  eventOrder: number;
  x: number;
  y: number;
}

export interface StoryTimelineGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "prerequisite" | "consequence";
}

export interface StoryTimelineGraphModel {
  nodes: StoryTimelineGraphNode[];
  edges: StoryTimelineGraphEdge[];
}

export const TIMELINE_NODE_WIDTH = 224;
export const TIMELINE_NODE_HEIGHT = 64;
const COLUMN_GAP = 288;
const ROW_GAP = 88;

export const TIMELINE_STATUS_META = {
  occurred: { label: "已发生", tone: "success" },
  planned: { label: "计划中", tone: "info" },
  foreshadowed: { label: "铺垫中", tone: "warning" },
  resolved: { label: "已回收", tone: "success" },
  cancelled: { label: "已取消", tone: "muted" },
  superseded: { label: "已替换", tone: "muted" },
} as const satisfies Record<StoryTimelineEvent["status"], { label: string; tone: string }>;

export const TIMELINE_TYPE_LABELS: Record<StoryTimelineEvent["type"], string> = {
  plot: "主线",
  relationship: "关系",
  conflict: "冲突",
  reveal: "揭示",
  battle: "战斗",
  decision: "抉择",
  setup: "铺垫",
  payoff: "回收",
  transition: "过渡",
  background: "背景",
  world_state: "世界状态",
};

export const TIMELINE_SOURCE_LABELS: Record<StoryTimelineEvent["source"], string> = {
  outline: "大纲",
  chapter_plan: "章节规划",
  manual: "手动登记",
  chapter_extraction: "正文提取",
  repair: "修复回填",
  imported: "导入",
};

export const TIMELINE_VISIBILITY_LABELS: Record<StoryTimelineEvent["visibility"], string> = {
  reader_known: "读者已知",
  protagonist_known: "主角已知",
  character_known: "角色已知",
  hidden_truth: "隐藏真相",
};

export function buildStoryTimelineGraph(events: StoryTimelineEvent[]): StoryTimelineGraphModel {
  const withChapter = events.filter((event) => typeof event.chapterIndex === "number");
  const withoutChapter = events.filter((event) => typeof event.chapterIndex !== "number");
  const chapterIndexes = Array.from(new Set(withChapter.map((event) => event.chapterIndex as number)))
    .sort((left, right) => left - right);

  const columns = chapterIndexes.map((chapterIndex) => ({
    label: `第 ${chapterIndex} 章`,
    events: withChapter
      .filter((event) => event.chapterIndex === chapterIndex)
      .sort((left, right) => left.eventOrder - right.eventOrder),
  }));
  if (withoutChapter.length > 0) {
    columns.push({
      label: "未挂章",
      events: [...withoutChapter].sort((left, right) => left.eventOrder - right.eventOrder),
    });
  }

  const nodes = columns.flatMap((column, columnIndex) => column.events.map((event, rowIndex) => ({
    id: event.id,
    title: event.title,
    summary: event.summary,
    status: event.status,
    type: event.type,
    chapterIndex: typeof event.chapterIndex === "number" ? event.chapterIndex : null,
    chapterLabel: column.label,
    eventOrder: event.eventOrder,
    x: columnIndex * COLUMN_GAP,
    y: rowIndex * ROW_GAP,
  })));
  const nodeIds = new Set(nodes.map((node) => node.id));

  const edgeMap = new Map<string, StoryTimelineGraphEdge>();
  for (const event of events) {
    if (!nodeIds.has(event.id)) {
      continue;
    }
    for (const prerequisiteId of event.prerequisiteEventIds ?? []) {
      if (!nodeIds.has(prerequisiteId)) {
        continue;
      }
      edgeMap.set(`${prerequisiteId}->${event.id}`, {
        id: `${prerequisiteId}->${event.id}`,
        source: prerequisiteId,
        target: event.id,
        kind: "prerequisite",
      });
    }
    for (const consequenceId of event.consequenceEventIds ?? []) {
      if (!nodeIds.has(consequenceId)) {
        continue;
      }
      edgeMap.set(`${event.id}->${consequenceId}`, {
        id: `${event.id}->${consequenceId}`,
        source: event.id,
        target: consequenceId,
        kind: "consequence",
      });
    }
  }

  return { nodes, edges: Array.from(edgeMap.values()) };
}
