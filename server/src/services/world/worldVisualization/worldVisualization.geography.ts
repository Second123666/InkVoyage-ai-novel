import type {
  WorldGeographyDirection,
  WorldGeographyMapEdge,
  WorldGeographyMapNode,
  WorldGeographyRegionType,
  WorldGeographyRouteType,
  WorldVisualizationPayload,
} from "@ai-novel/shared/types/world";
import {
  DIRECTION_COORDINATES,
  GEO_DIRECTIONS,
  GEO_REGION_TYPES,
  GEO_ROUTE_TYPES,
  MAX_FACTION_EDGES,
  MAX_GEO_NODES,
  makeId,
  normalizeAliasKey,
  normalizeNodeLabel,
  normalizeTextField,
  parseListFromText,
  uniqueStrings,
  type GeographyEdgeInput,
  type GeographyNodeInput,
  type VisualizationSource,
} from "./worldVisualization.shared";

// worldVisualization 地理图:方向/区域/路线归一化与地理节点、边构建。
// 拆分自原 worldVisualization.ts,行为不变(RF-1)。
function clampMapCoordinate(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeDirection(raw: unknown): WorldGeographyDirection | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = normalizeAliasKey(raw);
  const aliases: Record<string, WorldGeographyDirection> = {
    north: "north",
    北: "north",
    北方: "north",
    北部: "north",
    south: "south",
    南: "south",
    南方: "south",
    南部: "south",
    east: "east",
    东: "east",
    东方: "east",
    东部: "east",
    west: "west",
    西: "west",
    西方: "west",
    西部: "west",
    center: "center",
    central: "center",
    中: "center",
    中央: "center",
    中部: "center",
    核心: "center",
    northeast: "northeast",
    东北: "northeast",
    northwest: "northwest",
    西北: "northwest",
    southeast: "southeast",
    东南: "southeast",
    southwest: "southwest",
    西南: "southwest",
  };
  const alias = aliases[normalized];
  return alias && GEO_DIRECTIONS.has(alias) ? alias : undefined;
}

export function inferDirectionFromText(text: string, index: number): WorldGeographyDirection {
  if (/东北|北东/.test(text)) {
    return "northeast";
  }
  if (/西北|北西/.test(text)) {
    return "northwest";
  }
  if (/东南|南东/.test(text)) {
    return "southeast";
  }
  if (/西南|南西/.test(text)) {
    return "southwest";
  }
  if (/北方|北部|北境|北岸|北线|冰原|雪原/.test(text)) {
    return "north";
  }
  if (/南方|南部|南境|南岸|南线|雨林|热带/.test(text)) {
    return "south";
  }
  if (/东方|东部|东境|东岸|东线|海港|港口|海岸/.test(text)) {
    return "east";
  }
  if (/西方|西部|西境|西岸|西线|荒漠|沙漠/.test(text)) {
    return "west";
  }
  if (/中心|中央|王城|帝都|首都|核心|腹地|内城/.test(text)) {
    return "center";
  }
  const sequence: WorldGeographyDirection[] = [
    "center",
    "north",
    "east",
    "south",
    "west",
    "northeast",
    "southwest",
    "northwest",
    "southeast",
  ];
  return sequence[index % sequence.length] ?? "center";
}

export function offsetCoordinate(base: { x: number; y: number }, index: number): { x: number; y: number } {
  const ringOffsets = [
    { x: 0, y: 0 },
    { x: 6, y: -5 },
    { x: -6, y: 5 },
    { x: 8, y: 6 },
    { x: -8, y: -6 },
  ];
  const offset = ringOffsets[index % ringOffsets.length] ?? ringOffsets[0];
  return {
    x: Math.max(8, Math.min(92, base.x + offset.x)),
    y: Math.max(8, Math.min(92, base.y + offset.y)),
  };
}

export function inferRegionType(text: string): WorldGeographyRegionType {
  if (/大陆|洲|陆/.test(text)) {
    return "continent";
  }
  if (/国|王朝|王国|帝国|联邦|共和国|领/.test(text)) {
    return "country";
  }
  if (/城|都|镇|港|堡|关/.test(text)) {
    return "city";
  }
  if (/山|谷|河|湖|海|岛|林|原|漠|矿|塔|遗迹|神殿/.test(text)) {
    return "landmark";
  }
  if (/边境|边疆|边界|防线|封锁线/.test(text)) {
    return "border";
  }
  if (/路|道|航线|商道|铁路|河道/.test(text)) {
    return "route";
  }
  return "region";
}

function normalizeRegionType(raw: unknown, label: string): WorldGeographyRegionType {
  if (typeof raw === "string") {
    const normalized = normalizeAliasKey(raw);
    if (GEO_REGION_TYPES.has(normalized as WorldGeographyRegionType)) {
      return normalized as WorldGeographyRegionType;
    }
  }
  return inferRegionType(label);
}

export function normalizeRouteType(raw: unknown, relation: string): WorldGeographyRouteType {
  if (typeof raw === "string") {
    const normalized = normalizeAliasKey(raw);
    if (GEO_ROUTE_TYPES.has(normalized as WorldGeographyRouteType)) {
      return normalized as WorldGeographyRouteType;
    }
    if (/路|road|道路/.test(normalized)) {
      return "road";
    }
    if (/river|河/.test(normalized)) {
      return "river";
    }
    if (/sea|海|航/.test(normalized)) {
      return "sea";
    }
    if (/portal|传送|门/.test(normalized)) {
      return "portal";
    }
    if (/trade|商|贸易/.test(normalized)) {
      return "trade";
    }
    if (/military|军|战/.test(normalized)) {
      return "military";
    }
    if (/border|边/.test(normalized)) {
      return "border";
    }
  }
  if (/控制|封锁|边境|边界/.test(relation)) {
    return "border";
  }
  if (/通道|道路|商道/.test(relation)) {
    return "road";
  }
  return "other";
}


export function normalizeGeographyNodes(
  nodes: GeographyNodeInput[],
  fallbackNodes: WorldGeographyMapNode[],
): WorldGeographyMapNode[] {
  const seenLabels = new Set<string>();
  const result: WorldGeographyMapNode[] = [];
  for (const node of nodes) {
    const label = normalizeNodeLabel(node.label);
    if (!label || seenLabels.has(label)) {
      continue;
    }
    seenLabels.add(label);
    const directionHint = normalizeDirection(node.directionHint) ?? inferDirectionFromText(
      [label, node.terrain, node.summary, node.risk, node.storyRelevance].filter(Boolean).join(" "),
      result.length,
    );
    const basePoint = DIRECTION_COORDINATES[directionHint];
    const fallbackPoint = offsetCoordinate(basePoint, result.length);
    result.push({
      id: node.id?.trim() || makeId("geo", result.length),
      label,
      x: clampMapCoordinate(node.x) ?? fallbackPoint.x,
      y: clampMapCoordinate(node.y) ?? fallbackPoint.y,
      directionHint,
      regionType: normalizeRegionType(node.regionType, label),
      terrain: normalizeTextField(node.terrain),
      summary: normalizeTextField(node.summary),
      parentId: normalizeTextField(node.parentId) ?? null,
      controllingForceIds: Array.isArray(node.controllingForceIds)
        ? uniqueStrings(node.controllingForceIds.filter((item): item is string => typeof item === "string"))
        : undefined,
      risk: normalizeTextField(node.risk),
      storyRelevance: normalizeTextField(node.storyRelevance),
    });
  }
  return (result.length > 0 ? result : fallbackNodes).slice(0, MAX_GEO_NODES);
}

export function normalizeGeographyEdges(
  edges: GeographyEdgeInput[],
  nodes: WorldGeographyMapNode[],
  fallbackEdges: WorldGeographyMapEdge[],
): WorldGeographyMapEdge[] {
  const idMap = new Map(nodes.map((node) => [node.id, node.id]));
  const labelMap = new Map(nodes.map((node) => [node.label, node.id]));
  const seen = new Set<string>();
  const result: WorldGeographyMapEdge[] = [];

  for (const edge of edges) {
    const sourceKey = typeof edge.source === "string" ? edge.source.trim() : "";
    const targetKey = typeof edge.target === "string" ? edge.target.trim() : "";
    const source = idMap.get(sourceKey) ?? labelMap.get(sourceKey);
    const target = idMap.get(targetKey) ?? labelMap.get(targetKey);
    if (!source || !target || source === target) {
      continue;
    }
    const pairKey = [source, target].sort().join("|");
    if (seen.has(pairKey)) {
      continue;
    }
    seen.add(pairKey);
    const relation = typeof edge.relation === "string" && edge.relation.trim()
      ? edge.relation.trim()
      : "相邻";
    result.push({
      source,
      target,
      relation,
      routeType: normalizeRouteType(edge.routeType, relation),
      distanceHint: normalizeTextField(edge.distanceHint),
      direction: normalizeDirection(edge.direction),
      risk: normalizeTextField(edge.risk),
    });
  }

  return (result.length > 0 ? result : fallbackEdges).slice(0, MAX_FACTION_EDGES);
}

export function buildGeographyMap(world: VisualizationSource): WorldVisualizationPayload["geographyMap"] {
  const geoSeeds = parseListFromText(
    [world.geography ?? "", world.background ?? ""].filter(Boolean).join("\n"),
    ["核心区域", "边境区域", "未知区域"],
  )
    .slice(0, MAX_GEO_NODES)
    .map((label, index) => {
      const directionHint = inferDirectionFromText(label, index);
      const point = offsetCoordinate(DIRECTION_COORDINATES[directionHint], index);
      return {
        id: makeId("geo", index),
        label,
        x: point.x,
        y: point.y,
        directionHint,
        regionType: inferRegionType(label),
      };
    });

  const edges = geoSeeds.slice(1).map((node, index) => ({
    source: geoSeeds[index]?.id ?? geoSeeds[0].id,
    target: node.id,
    relation: "相邻",
    routeType: "other" as const,
    direction: node.directionHint,
  }));

  return {
    nodes: geoSeeds,
    edges,
  };
}

