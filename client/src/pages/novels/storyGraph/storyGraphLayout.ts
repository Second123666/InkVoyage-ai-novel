import type { StoryGraphNodeKind } from "@ai-novel/shared/types/storyWorldGraph";

// INN-C1:图谱节点的确定性同心环布局(纯函数,渲染层只消费坐标)。
// 势力在内环(结构核心),角色次之(主角关系),地点与要素在外环。

const RING_ORDER: StoryGraphNodeKind[] = ["faction", "character", "location", "element"];

const RING_RADIUS: Record<StoryGraphNodeKind, number> = {
  faction: 150,
  character: 320,
  location: 480,
  element: 620,
};

export interface StoryGraphLayoutInput {
  id: string;
  kind: StoryGraphNodeKind;
}

export interface StoryGraphLayoutPoint {
  x: number;
  y: number;
}

export function computeStoryGraphLayout(
  nodes: StoryGraphLayoutInput[],
): Record<string, StoryGraphLayoutPoint> {
  const positions: Record<string, StoryGraphLayoutPoint> = {};
  const grouped = new Map<StoryGraphNodeKind, string[]>();
  for (const kind of RING_ORDER) {
    grouped.set(kind, []);
  }
  for (const node of nodes) {
    const bucket = grouped.get(node.kind) ?? grouped.get("element");
    bucket?.push(node.id);
  }

  for (const kind of RING_ORDER) {
    const ids = grouped.get(kind) ?? [];
    const radius = RING_RADIUS[kind];
    ids.forEach((id, index) => {
      // 单节点环放在顶部;多节点从顶部开始均匀分布,保证顺序稳定可测。
      const angle = ids.length === 1 ? 0 : (index * 2 * Math.PI) / ids.length;
      positions[id] = {
        x: Math.round(radius * Math.cos(angle)),
        y: Math.round(radius * Math.sin(angle)),
      };
    });
  }
  return positions;
}
