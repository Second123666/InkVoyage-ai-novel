// INN-C1 故事世界图谱:把小说侧结构化数据(角色/关系阶段/势力轨迹/世界切片)
// 确定性投影为 角色×势力×地点 的只读图谱。渲染层在客户端,次轮接入 React Flow。
import { storyWorldSliceSchema } from "@ai-novel/shared/types/storyWorldSlice";
import type {
  StoryGraphEdge,
  StoryGraphNode,
  StoryWorldGraphCoverage,
  StoryWorldGraphPayload,
} from "@ai-novel/shared/types/storyWorldGraph";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";

export const STORY_GRAPH_MAX_NODES = 200;
export const STORY_GRAPH_MAX_EDGES = 400;

interface GraphCharacterRow {
  id: string;
  name: string;
  role?: string | null;
  factionLabel?: string | null;
}

interface GraphRelationStageRow {
  id: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  stageLabel: string;
  stageSummary?: string | null;
  nextTurnPoint?: string | null;
  isCurrent?: boolean;
}

interface GraphFactionTrackRow {
  id: string;
  characterId: string;
  factionLabel: string;
  stanceLabel?: string | null;
  updatedAt: Date | string;
}

interface GraphSlice {
  activeForces: Array<{ id: string; name: string; summary?: string; roleInStory?: string }>;
  activeLocations: Array<{ id: string; name: string; summary?: string; storyUse?: string }>;
  activeElements: Array<{ id: string; label: string; type?: string; summary?: string }>;
}

function normalizeLabel(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

export function parseStoryWorldSlice(raw: string | null | undefined): GraphSlice | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = storyWorldSliceSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      return null;
    }
    return {
      activeForces: parsed.data.activeForces,
      activeLocations: parsed.data.activeLocations,
      activeElements: parsed.data.activeElements,
    };
  } catch {
    return null;
  }
}

export function buildStoryWorldGraph(input: {
  novelId: string;
  characters: GraphCharacterRow[];
  relationStages: GraphRelationStageRow[];
  factionTracks: GraphFactionTrackRow[];
  slice: GraphSlice | null;
  generatedAt?: string;
}): StoryWorldGraphPayload {
  const nodes: StoryGraphNode[] = [];
  const characterNodeIdByCharacterId = new Map<string, string>();
  const factionNodeIdByLabel = new Map<string, string>();

  for (const character of [...input.characters].sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"))) {
    if (!character.name?.trim()) {
      continue;
    }
    const nodeId = `character:${character.id}`;
    characterNodeIdByCharacterId.set(character.id, nodeId);
    nodes.push({
      id: nodeId,
      kind: "character",
      label: character.name.trim(),
      meta: {
        role: character.role ?? null,
        factionLabel: character.factionLabel ?? null,
      },
    });
  }

  for (const force of input.slice?.activeForces ?? []) {
    const nodeId = `faction:force:${force.id}`;
    factionNodeIdByLabel.set(normalizeLabel(force.name), nodeId);
    nodes.push({
      id: nodeId,
      kind: "faction",
      label: force.name,
      summary: force.summary ?? null,
      meta: { roleInStory: force.roleInStory ?? null, source: "slice" },
    });
  }

  const tracksByRecency = [...input.factionTracks].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
  for (const track of tracksByRecency) {
    const normalized = normalizeLabel(track.factionLabel);
    if (!normalized || factionNodeIdByLabel.has(normalized)) {
      continue;
    }
    const nodeId = `faction:track:${normalized}`;
    factionNodeIdByLabel.set(normalized, nodeId);
    nodes.push({
      id: nodeId,
      kind: "faction",
      label: track.factionLabel.trim(),
      summary: null,
      meta: { source: "faction_track" },
    });
  }

  for (const location of input.slice?.activeLocations ?? []) {
    nodes.push({
      id: `location:${location.id}`,
      kind: "location",
      label: location.name,
      summary: location.summary ?? null,
      meta: { storyUse: location.storyUse ?? null },
    });
  }

  for (const element of input.slice?.activeElements ?? []) {
    nodes.push({
      id: `element:${element.id}`,
      kind: "element",
      label: element.label,
      summary: element.summary ?? null,
      meta: { type: element.type ?? null },
    });
  }

  const edges: StoryGraphEdge[] = [];
  for (const stage of input.relationStages) {
    if (stage.isCurrent === false) {
      continue;
    }
    const source = characterNodeIdByCharacterId.get(stage.sourceCharacterId);
    const target = characterNodeIdByCharacterId.get(stage.targetCharacterId);
    if (!source || !target || source === target) {
      continue;
    }
    edges.push({
      id: `relation:${stage.id}`,
      kind: "character_relation",
      source,
      target,
      label: stage.stageLabel,
      meta: {
        summary: stage.stageSummary ?? null,
        nextTurnPoint: stage.nextTurnPoint ?? null,
      },
    });
  }

  const seenMembership = new Set<string>();
  for (const track of tracksByRecency) {
    const characterNodeId = characterNodeIdByCharacterId.get(track.characterId);
    const factionNodeId = factionNodeIdByLabel.get(normalizeLabel(track.factionLabel));
    if (!characterNodeId || !factionNodeId) {
      continue;
    }
    const pairKey = `${track.characterId}:${normalizeLabel(track.factionLabel)}`;
    if (seenMembership.has(pairKey)) {
      continue;
    }
    seenMembership.add(pairKey);
    edges.push({
      id: `membership:${pairKey}`,
      kind: "faction_membership",
      source: characterNodeId,
      target: factionNodeId,
      label: track.factionLabel.trim(),
      meta: { stanceLabel: track.stanceLabel ?? null },
    });
  }

  const totalEdgeCount = edges.length;
  const limitedNodes = nodes.slice(0, STORY_GRAPH_MAX_NODES);
  const nodeIds = new Set(limitedNodes.map((node) => node.id));
  const limitedEdges = edges
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, STORY_GRAPH_MAX_EDGES);
  const coverage: StoryWorldGraphCoverage = {
    hasSlice: Boolean(input.slice),
    relationStageCount: input.relationStages.length,
    factionTrackCount: input.factionTracks.length,
  };
  const countKind = (kind: StoryGraphNode["kind"]) => limitedNodes.filter((node) => node.kind === kind).length;

  return {
    novelId: input.novelId,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    nodes: limitedNodes,
    edges: limitedEdges,
    stats: {
      characterCount: countKind("character"),
      factionCount: countKind("faction"),
      locationCount: countKind("location"),
      elementCount: countKind("element"),
      edgeCount: limitedEdges.length,
      totalEdgeCount,
      truncated: limitedNodes.length < nodes.length || limitedEdges.length < totalEdgeCount,
    },
    coverage,
  };
}

export const storyWorldGraphService = {
  async build(novelId: string): Promise<StoryWorldGraphPayload> {
    const [novel, relationStages, factionTracks] = await Promise.all([
      prisma.novel.findUnique({
        where: { id: novelId },
        select: {
          id: true,
          storyWorldSliceJson: true,
          characters: {
            select: { id: true, name: true, role: true, factionLabel: true },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.characterRelationStage.findMany({
        where: { novelId, isCurrent: true },
        select: {
          id: true,
          sourceCharacterId: true,
          targetCharacterId: true,
          stageLabel: true,
          stageSummary: true,
          nextTurnPoint: true,
          isCurrent: true,
        },
        orderBy: { updatedAt: "desc" },
        take: STORY_GRAPH_MAX_EDGES,
      }),
      prisma.characterFactionTrack.findMany({
        where: { novelId },
        select: { id: true, characterId: true, factionLabel: true, stanceLabel: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 300,
      }),
    ]);
    if (!novel) {
      throw new AppError("Novel not found.", 404);
    }
    return buildStoryWorldGraph({
      novelId,
      characters: novel.characters,
      relationStages,
      factionTracks,
      slice: parseStoryWorldSlice(novel.storyWorldSliceJson),
    });
  },
};
