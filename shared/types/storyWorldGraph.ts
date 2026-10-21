// INN-C1 故事世界图谱:按小说聚合 角色×势力×地点 的只读图谱投影(渲染层在客户端)。
export type StoryGraphNodeKind = "character" | "faction" | "location" | "element";

export type StoryGraphEdgeKind = "character_relation" | "faction_membership";

export interface StoryGraphNode {
  id: string;
  kind: StoryGraphNodeKind;
  label: string;
  summary?: string | null;
  meta?: Record<string, string | null>;
}

export interface StoryGraphEdge {
  id: string;
  kind: StoryGraphEdgeKind;
  source: string;
  target: string;
  label: string;
  meta?: Record<string, string | null>;
}

export interface StoryWorldGraphStats {
  characterCount: number;
  factionCount: number;
  locationCount: number;
  elementCount: number;
  edgeCount: number;
  /** 截断前的原始总数(仅在触发上限时与 *Count 不同)。 */
  totalEdgeCount: number;
  truncated: boolean;
}

export interface StoryWorldGraphCoverage {
  hasSlice: boolean;
  relationStageCount: number;
  factionTrackCount: number;
}

export interface StoryWorldGraphPayload {
  novelId: string;
  generatedAt: string;
  nodes: StoryGraphNode[];
  edges: StoryGraphEdge[];
  stats: StoryWorldGraphStats;
  coverage: StoryWorldGraphCoverage;
}
