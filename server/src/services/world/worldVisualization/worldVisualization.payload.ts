import type {
  WorldGeographyMapEdge,
  WorldVisualizationPayload,
} from "@ai-novel/shared/types/world";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { worldVisualizationPrompt } from "../../../prompting/prompts/world/world.prompts";
import { buildWorldBindingSupport, parseWorldStructurePayload } from "../worldStructure";
import {
  DIRECTION_COORDINATES,
  MAX_FACTION_EDGES,
  MAX_FACTION_NODES,
  MAX_GEO_NODES,
  MAX_POWER_ITEMS,
  MAX_TIMELINE_ITEMS,
  makeId,
  type VisualizationDraft,
  type VisualizationSource,
} from "./worldVisualization.shared";
import {
  buildFactionEdges,
  buildFactionLabels,
  buildPowerTree,
  buildTimeline,
  inferFactionNodeType,
  normalizeGraphEdges,
  normalizeGraphNodes,
  normalizeNodeType,
} from "./worldVisualization.faction";
import {
  buildGeographyMap,
  inferDirectionFromText,
  inferRegionType,
  normalizeGeographyEdges,
  normalizeGeographyNodes,
  normalizeRouteType,
  offsetCoordinate,
} from "./worldVisualization.geography";

// worldVisualization 载荷:结构化优先、自由文本兜底、LLM 草稿清洗与最终入口。
// 拆分自原 worldVisualization.ts,行为不变(RF-1)。
function buildStructuredWorldVisualizationPayload(world: VisualizationSource): WorldVisualizationPayload | null {
  const { structure, hasStructuredData } = parseWorldStructurePayload(world.structureJson, world.bindingSupportJson);
  if (!hasStructuredData) {
    return null;
  }

  const forceNodes = structure.forces.map((item) => ({
    id: item.id,
    label: item.name,
    type: normalizeNodeType(item.type, item.name),
  }));
  const factionNodes = structure.factions
    .filter((item) => !forceNodes.some((force) => force.label === item.name))
    .map((item) => ({
      id: item.id,
      label: item.name,
      type: "faction",
    }));
  const factionNodesMerged = [...forceNodes, ...factionNodes].slice(0, MAX_FACTION_NODES);
  const factionNodeIds = new Set(factionNodesMerged.map((item) => item.id));
  const factionEdges = structure.relations.forceRelations
    .filter((item) => factionNodeIds.has(item.sourceForceId) && factionNodeIds.has(item.targetForceId))
    .map((item) => ({
      source: item.sourceForceId,
      target: item.targetForceId,
      relation: item.relation || "关联",
    }))
    .slice(0, MAX_FACTION_EDGES);

  const geographyNodes = structure.locations
    .map((item, index) => {
      const directionHint = inferDirectionFromText(
        [item.name, item.terrain, item.summary, item.narrativeFunction, item.risk].join(" "),
        index,
      );
      const point = offsetCoordinate(DIRECTION_COORDINATES[directionHint], index);
      return {
        id: item.id,
        label: item.name,
        x: item.x ?? point.x,
        y: item.y ?? point.y,
        directionHint: item.directionHint ?? directionHint,
        regionType: inferRegionType([item.name, item.type, item.terrain].filter(Boolean).join(" ")),
        terrain: item.terrain || undefined,
        summary: item.summary || undefined,
        controllingForceIds: item.controllingForceIds,
        risk: item.risk || (item.riskLevel ? `风险等级 ${item.riskLevel}` : undefined),
        storyRelevance: item.storyRelevance || item.narrativeFunction || undefined,
      };
    })
    .slice(0, MAX_GEO_NODES);
  const geographyNodeIdSet = new Set(geographyNodes.map((item) => item.id));
  const forceNameById = new Map(structure.forces.map((item) => [item.id, item.name]));
  const explicitLocationEdges = (structure.relations.locationConnections ?? [])
    .filter((item) => geographyNodeIdSet.has(item.sourceLocationId) && geographyNodeIdSet.has(item.targetLocationId))
    .map((item) => ({
      source: item.sourceLocationId,
      target: item.targetLocationId,
      relation: item.connectionType || "相邻",
      routeType: normalizeRouteType(item.connectionType, item.connectionType),
      distanceHint: item.distanceHint || undefined,
      risk: item.narrativeUse || undefined,
    }));
  const geographyEdges = explicitLocationEdges.length > 0 ? explicitLocationEdges : structure.relations.locationControls
    .filter((item) => geographyNodeIdSet.has(item.locationId))
    .reduce<WorldGeographyMapEdge[]>((acc, relation, index, list) => {
      const sibling = list.find(
        (candidate, siblingIndex) =>
          siblingIndex > index
          && candidate.forceId === relation.forceId
          && candidate.locationId !== relation.locationId
          && geographyNodeIdSet.has(candidate.locationId),
      );
      if (!sibling) {
        return acc;
      }
      acc.push({
        source: relation.locationId,
        target: sibling.locationId,
        relation: `${forceNameById.get(relation.forceId) ?? relation.forceId}${relation.relation ? `:${relation.relation}` : "控制"}`,
        routeType: "border",
      });
      return acc;
    }, [])
    .slice(0, MAX_FACTION_EDGES);

  const powerTree = (
    structure.rules.axioms.length > 0
      ? structure.rules.axioms.map((item, index) => ({
        level: `R${index + 1}`,
        description: [item.name, item.summary].filter(Boolean).join("："),
      }))
      : buildPowerTree(world)
  ).slice(0, MAX_POWER_ITEMS);

  const bindingSupport = buildWorldBindingSupport(structure);
  const timeline = bindingSupport.compatibleConflicts.length > 0
    ? bindingSupport.compatibleConflicts.slice(0, MAX_TIMELINE_ITEMS).map((item, index) => ({
      year: `阶段${index + 1}`,
      event: item,
    }))
    : buildTimeline(world);

  if (factionNodesMerged.length === 0 && geographyNodes.length === 0) {
    return null;
  }

  const fallback = buildFallbackWorldVisualizationPayload(world);
  const shouldUseFallbackFactions = factionNodesMerged.length === 0;
  const shouldUseFallbackGeography = geographyNodes.length === 0;

  return {
    worldId: world.id,
    factionGraph: {
      nodes: shouldUseFallbackFactions ? fallback.factionGraph.nodes : factionNodesMerged,
      edges: shouldUseFallbackFactions ? fallback.factionGraph.edges : factionEdges,
    },
    powerTree,
    geographyMap: {
      nodes: shouldUseFallbackGeography ? fallback.geographyMap.nodes : geographyNodes,
      edges: shouldUseFallbackGeography ? fallback.geographyMap.edges : geographyEdges,
    },
    timeline,
  };
}


export function buildFallbackWorldVisualizationPayload(world: VisualizationSource): WorldVisualizationPayload {
  const factionLabels = buildFactionLabels(world);
  const factionNodes = factionLabels.map((label, index) => ({
    id: makeId("faction", index),
    label,
    type: inferFactionNodeType(label),
  }));
  const factionEdges = buildFactionEdges(factionNodes, world);

  return {
    worldId: world.id,
    factionGraph: {
      nodes: factionNodes,
      edges: factionEdges,
    },
    powerTree: buildPowerTree(world),
    geographyMap: buildGeographyMap(world),
    timeline: buildTimeline(world),
  };
}

function buildVisualizationPrompt(world: VisualizationSource): string {
  return [
    `世界名：${world.name}`,
    `世界类型：${world.worldType ?? "custom"}`,
    `概述：${world.description ?? "无"}`,
    `背景：${world.background ?? "无"}`,
    `势力：${world.factions ?? "无"}`,
    `政治：${world.politics ?? "无"}`,
    `种族：${world.races ?? "无"}`,
    `地理：${world.geography ?? "无"}`,
    `历史：${world.history ?? "无"}`,
    `冲突：${world.conflicts ?? "无"}`,
    `力量/科技：${[world.magicSystem, world.technology].filter(Boolean).join("\n") || "无"}`,
  ].join("\n\n");
}

async function tryBuildWorldVisualizationWithLLM(
  world: VisualizationSource,
): Promise<VisualizationDraft | null> {
  try {
    const result = await runStructuredPrompt({
      asset: worldVisualizationPrompt,
      promptInput: {
        worldPromptSource: buildVisualizationPrompt(world),
      },
      options: {
        temperature: 0.2,
      },
    });
    return result.output;
  } catch {
    return null;
  }
}

function sanitizeVisualizationPayload(
  world: VisualizationSource,
  draft: VisualizationDraft | null,
  fallback: WorldVisualizationPayload,
): WorldVisualizationPayload {
  const factionNodes = normalizeGraphNodes(draft?.factionGraph?.nodes ?? fallback.factionGraph.nodes, "faction")
    .slice(0, MAX_FACTION_NODES);
  const factionEdges = normalizeGraphEdges(
    draft?.factionGraph?.edges ?? [],
    factionNodes,
    fallback.factionGraph.edges,
  );

  const geographyNodes = normalizeGeographyNodes(
    draft?.geographyMap?.nodes ?? fallback.geographyMap.nodes,
    fallback.geographyMap.nodes,
  );
  const geographyEdges = normalizeGeographyEdges(
    draft?.geographyMap?.edges ?? [],
    geographyNodes,
    fallback.geographyMap.edges,
  );

  const powerTree = (draft?.powerTree ?? fallback.powerTree)
    .map((item, index) => ({
      level: typeof item.level === "string" && item.level.trim() ? item.level.trim() : `L${index + 1}`,
      description: typeof item.description === "string" ? item.description.trim() : "",
    }))
    .filter((item) => item.description)
    .slice(0, MAX_POWER_ITEMS);

  const timeline = (draft?.timeline ?? fallback.timeline)
    .map((item, index) => ({
      year: typeof item.year === "string" && item.year.trim() ? item.year.trim() : `阶段${index + 1}`,
      event: typeof item.event === "string" ? item.event.trim() : "",
    }))
    .filter((item) => item.event)
    .slice(0, MAX_TIMELINE_ITEMS);

  return {
    worldId: world.id,
    factionGraph: {
      nodes: factionNodes.length > 0 ? factionNodes : fallback.factionGraph.nodes,
      edges: factionEdges,
    },
    powerTree: powerTree.length > 0 ? powerTree : fallback.powerTree,
    geographyMap: {
      nodes: geographyNodes.length > 0 ? geographyNodes : fallback.geographyMap.nodes,
      edges: geographyEdges,
    },
    timeline: timeline.length > 0 ? timeline : fallback.timeline,
  };
}

export async function buildWorldVisualizationPayload(world: VisualizationSource): Promise<WorldVisualizationPayload> {
  const structured = buildStructuredWorldVisualizationPayload(world);
  if (structured) {
    return structured;
  }
  const fallback = buildFallbackWorldVisualizationPayload(world);
  const draft = await tryBuildWorldVisualizationWithLLM(world);
  return sanitizeVisualizationPayload(world, draft, fallback);
}
