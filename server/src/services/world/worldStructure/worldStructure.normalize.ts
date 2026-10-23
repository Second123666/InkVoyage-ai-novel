import type {
  WorldBindingLocationCluster,
  WorldBindingSupport,
  WorldFaction,
  WorldForce,
  WorldForceRelation,
  WorldLocation,
  WorldLocationConnectionRelation,
  WorldLocationControlRelation,
  WorldProfile,
  WorldRule,
  WorldRules,
  WorldStructuredData,
  WorldStructureSectionKey,
} from "@ai-novel/shared/types/world";
import {
  WORLD_STRUCTURE_SCHEMA_VERSION,
  buildRuleFromText,
  createEmptyWorldBindingSupport,
  createEmptyWorldProfile,
  createEmptyWorldRelations,
  createEmptyWorldRules,
  createEmptyWorldStructure,
  dedupeById,
  makeId,
  normalizeRecord,
  normalizeStringArray,
  normalizeText,
  safeParseJSON,
} from "./worldStructure.shared";

// worldStructure 归一化:把任意来源的结构化数据收敛为稳定形状。
// 拆分自原 worldStructure.ts,行为不变(RF-1)。
function normalizeProfile(raw: unknown, fallback: WorldProfile): WorldProfile {
  const record = normalizeRecord(raw);
  return {
    summary: normalizeText(record.summary ?? record.description, fallback.summary),
    identity: normalizeText(record.identity ?? record.worldIdentity, fallback.identity),
    tone: normalizeText(record.tone ?? record.mood, fallback.tone),
    themes: normalizeStringArray(record.themes ?? record.keywords).slice(0, 8),
    coreConflict: normalizeText(record.coreConflict ?? record.conflict, fallback.coreConflict),
  };
}

function normalizeRules(raw: unknown, fallback: WorldRules): WorldRules {
  const record = normalizeRecord(raw);
  const axiomsSource = Array.isArray(record.axioms)
    ? record.axioms
    : Array.isArray(record.rules)
      ? record.rules
      : [];
  const axioms = axiomsSource
    .map((item, index) => {
      if (typeof item === "string") {
        return buildRuleFromText(item, index);
      }
      const row = normalizeRecord(item);
      const name = normalizeText(row.name ?? row.title ?? row.rule, "");
      const summary = normalizeText(row.summary ?? row.description ?? row.content, "");
      const id = normalizeText(row.id, "") || makeId("rule", index, name || summary || `rule-${index + 1}`);
      if (!name && !summary) {
        return null;
      }
      return {
        id,
        name: name || `规则 ${index + 1}`,
        summary: summary || name,
        cost: normalizeText(row.cost),
        boundary: normalizeText(row.boundary ?? row.limit),
        enforcement: normalizeText(row.enforcement ?? row.consequence),
      } satisfies WorldRule;
    })
    .filter((item): item is WorldRule => Boolean(item));

  return {
    summary: normalizeText(record.summary ?? record.description, fallback.summary),
    axioms,
    taboo: normalizeStringArray(record.taboo ?? record.taboos),
    sharedConsequences: normalizeStringArray(record.sharedConsequences ?? record.consequences),
  };
}

export function normalizeFaction(raw: unknown, index: number): WorldFaction | null {
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      return null;
    }
    return {
      id: makeId("faction", index, value),
      name: value,
      position: "",
      doctrine: "",
      goals: [],
      methods: [],
      representativeForceIds: [],
    };
  }
  const record = normalizeRecord(raw);
  const name = normalizeText(record.name ?? record.title ?? record.label);
  if (!name) {
    return null;
  }
  return {
    id: normalizeText(record.id) || makeId("faction", index, name),
    name,
    position: normalizeText(record.position ?? record.stance),
    doctrine: normalizeText(record.doctrine ?? record.summary ?? record.description),
    goals: normalizeStringArray(record.goals ?? record.objectives),
    methods: normalizeStringArray(record.methods),
    representativeForceIds: normalizeStringArray(record.representativeForceIds ?? record.forceIds),
  };
}

export function normalizeForce(raw: unknown, index: number): WorldForce | null {
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      return null;
    }
    return {
      id: makeId("force", index, value),
      name: value,
    type: "",
    factionId: null,
    role: null,
    resources: [],
    controlledLocationIds: [],
    summary: "",
      baseOfPower: "",
      currentObjective: "",
      pressure: "",
      leader: null,
      narrativeRole: "",
    };
  }
  const record = normalizeRecord(raw);
  const name = normalizeText(record.name ?? record.title ?? record.label);
  if (!name) {
    return null;
  }
  return {
    id: normalizeText(record.id) || makeId("force", index, name),
    name,
    type: normalizeText(record.type ?? record.category),
    factionId: normalizeText(record.factionId ?? record.faction) || null,
    role: normalizeText(record.role) || null,
    resources: normalizeStringArray(record.resources),
    controlledLocationIds: normalizeStringArray(record.controlledLocationIds ?? record.locationIds),
    summary: normalizeText(record.summary ?? record.description),
    baseOfPower: normalizeText(record.baseOfPower ?? record.powerBase),
    currentObjective: normalizeText(record.currentObjective ?? record.goal),
    pressure: normalizeText(record.pressure ?? record.tension),
    leader: normalizeText(record.leader) || null,
    narrativeRole: normalizeText(record.narrativeRole ?? record.role),
  };
}

export function normalizeLocation(raw: unknown, index: number): WorldLocation | null {
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      return null;
    }
    return {
      id: makeId("location", index, value),
      name: value,
      type: null,
      region: null,
      terrain: "",
      summary: "",
      narrativeFunction: "",
      risk: "",
      riskLevel: undefined,
      storyRelevance: "",
      entryConstraint: "",
      exitCost: "",
      controllingForceIds: [],
    };
  }
  const record = normalizeRecord(raw);
  const name = normalizeText(record.name ?? record.title ?? record.label);
  if (!name) {
    return null;
  }
  return {
    id: normalizeText(record.id) || makeId("location", index, name),
    name,
    type: normalizeText(record.type ?? record.category) || null,
    region: normalizeText(record.region) || null,
    x: normalizeMapCoordinate(record.x),
    y: normalizeMapCoordinate(record.y),
    directionHint: normalizeGeographyDirection(record.directionHint ?? record.direction),
    terrain: normalizeText(record.terrain ?? record.type ?? record.category),
    summary: normalizeText(record.summary ?? record.description),
    narrativeFunction: normalizeText(record.narrativeFunction ?? record.function),
    risk: normalizeText(record.risk ?? record.danger),
    riskLevel: normalizeRiskLevel(record.riskLevel),
    storyRelevance: normalizeText(record.storyRelevance) || normalizeText(record.narrativeFunction ?? record.function),
    entryConstraint: normalizeText(record.entryConstraint ?? record.access),
    exitCost: normalizeText(record.exitCost ?? record.leaveCost),
    controllingForceIds: normalizeStringArray(record.controllingForceIds ?? record.forceIds),
  };
}


function normalizeMapCoordinate(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function normalizeRiskLevel(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return undefined;
  }
  return Math.max(1, Math.min(5, Math.round(raw)));
}

function normalizeGeographyDirection(raw: unknown): WorldLocation["directionHint"] {
  if (typeof raw !== "string") {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  const aliases: Record<string, WorldLocation["directionHint"]> = {
    north: "north",
    "北": "north",
    "北方": "north",
    south: "south",
    "南": "south",
    "南方": "south",
    east: "east",
    "东": "east",
    "东方": "east",
    west: "west",
    "西": "west",
    "西方": "west",
    center: "center",
    "中": "center",
    "中央": "center",
    northeast: "northeast",
    "东北": "northeast",
    northwest: "northwest",
    "西北": "northwest",
    southeast: "southeast",
    "东南": "southeast",
    southwest: "southwest",
    "西南": "southwest",
  };
  return aliases[normalized];
}

function normalizeForceRelation(raw: unknown, index: number): WorldForceRelation | null {
  const record = normalizeRecord(raw);
  const sourceForceId = normalizeText(record.sourceForceId ?? record.source ?? record.from);
  const targetForceId = normalizeText(record.targetForceId ?? record.target ?? record.to);
  if (!sourceForceId || !targetForceId || sourceForceId === targetForceId) {
    return null;
  }
  return {
    id: normalizeText(record.id) || makeId("force-relation", index, `${sourceForceId}-${targetForceId}`),
    sourceForceId,
    targetForceId,
    relation: normalizeText(record.relation ?? record.type, "关联"),
    tension: normalizeText(record.tension ?? record.pressure),
    detail: normalizeText(record.detail ?? record.summary ?? record.description),
  };
}

function normalizeLocationControl(raw: unknown, index: number): WorldLocationControlRelation | null {
  const record = normalizeRecord(raw);
  const forceId = normalizeText(record.forceId ?? record.sourceForceId ?? record.force);
  const locationId = normalizeText(record.locationId ?? record.targetLocationId ?? record.location);
  if (!forceId || !locationId) {
    return null;
  }
  return {
    id: normalizeText(record.id) || makeId("location-control", index, `${forceId}-${locationId}`),
    forceId,
    locationId,
    relation: normalizeText(record.relation ?? record.type, "控制"),
    detail: normalizeText(record.detail ?? record.summary ?? record.description),
  };
}

function normalizeLocationConnection(raw: unknown, index: number): WorldLocationConnectionRelation | null {
  const record = normalizeRecord(raw);
  const sourceLocationId = normalizeText(record.sourceLocationId ?? record.source ?? record.from);
  const targetLocationId = normalizeText(record.targetLocationId ?? record.target ?? record.to);
  if (!sourceLocationId || !targetLocationId || sourceLocationId === targetLocationId) {
    return null;
  }
  return {
    id: normalizeText(record.id) || makeId("location-connection", index, `${sourceLocationId}-${targetLocationId}`),
    sourceLocationId,
    targetLocationId,
    connectionType: normalizeText(record.connectionType ?? record.type ?? record.relation, "道路"),
    distanceHint: normalizeText(record.distanceHint ?? record.distance),
    narrativeUse: normalizeText(record.narrativeUse ?? record.detail ?? record.summary ?? record.description),
  };
}


function normalizeLocationClusters(raw: unknown): WorldBindingLocationCluster[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item, index) => {
      const record = normalizeRecord(item);
      const label = normalizeText(record.label ?? record.name ?? record.title);
      if (!label) {
        return null;
      }
      return {
        id: normalizeText(record.id) || makeId("cluster", index, label),
        label,
        locationIds: normalizeStringArray(record.locationIds ?? record.locations),
        reason: normalizeText(record.reason ?? record.summary ?? record.description),
      } satisfies WorldBindingLocationCluster;
    })
    .filter((item): item is WorldBindingLocationCluster => Boolean(item));
}

export function normalizeWorldBindingSupport(
  raw: unknown,
  fallback = createEmptyWorldBindingSupport(),
): WorldBindingSupport {
  const record = normalizeRecord(raw);
  return {
    recommendedEntryPoints: normalizeStringArray(
      record.recommendedEntryPoints ?? fallback.recommendedEntryPoints,
    ).slice(0, 6),
    highPressureForces: normalizeStringArray(
      record.highPressureForces ?? fallback.highPressureForces,
    ).slice(0, 6),
    suggestedLocationClusters: normalizeLocationClusters(
      record.suggestedLocationClusters ?? fallback.suggestedLocationClusters,
    ).slice(0, 4),
    compatibleConflicts: normalizeStringArray(
      record.compatibleConflicts ?? fallback.compatibleConflicts,
    ).slice(0, 8),
    forbiddenCombinations: normalizeStringArray(
      record.forbiddenCombinations ?? fallback.forbiddenCombinations,
    ).slice(0, 8),
  };
}

export function normalizeWorldStructuredData(
  raw: unknown,
  fallback = createEmptyWorldStructure(),
): WorldStructuredData {
  const record = normalizeRecord(raw);
  const factions = Array.isArray(record.factions)
    ? dedupeById(record.factions.map(normalizeFaction).filter((item): item is WorldFaction => Boolean(item)))
    : fallback.factions;
  const forces = Array.isArray(record.forces)
    ? dedupeById(record.forces.map(normalizeForce).filter((item): item is WorldForce => Boolean(item)))
    : fallback.forces;
  const locations = Array.isArray(record.locations)
    ? dedupeById(record.locations.map(normalizeLocation).filter((item): item is WorldLocation => Boolean(item)))
    : fallback.locations;
  const relationsRecord = normalizeRecord(record.relations);
  const forceIds = new Set(forces.map((item) => item.id));
  const locationIds = new Set(locations.map((item) => item.id));
  const rawForceRelations = Array.isArray(relationsRecord.forceRelations)
    ? relationsRecord.forceRelations
    : Array.isArray(relationsRecord.factionRelations)
      ? relationsRecord.factionRelations
      : null;
  const forceRelations = Array.isArray(rawForceRelations)
    ? rawForceRelations
      .map((item, index) => normalizeForceRelation(item, index))
      .filter(
        (item): item is WorldForceRelation =>
          item !== null && forceIds.has(item.sourceForceId) && forceIds.has(item.targetForceId),
      )
    : fallback.relations.forceRelations;
  const rawLocationControls = Array.isArray(relationsRecord.locationControls)
    ? relationsRecord.locationControls
    : Array.isArray(relationsRecord.locationRelations)
      ? relationsRecord.locationRelations
      : null;
  const locationControls = Array.isArray(rawLocationControls)
    ? rawLocationControls
      .map((item, index) => normalizeLocationControl(item, index))
      .filter(
        (item): item is WorldLocationControlRelation =>
          item !== null && forceIds.has(item.forceId) && locationIds.has(item.locationId),
      )
    : fallback.relations.locationControls;
  const rawLocationConnections = Array.isArray(relationsRecord.locationConnections)
    ? relationsRecord.locationConnections
    : Array.isArray(relationsRecord.locationEdges)
      ? relationsRecord.locationEdges
      : null;
  const locationConnections = Array.isArray(rawLocationConnections)
    ? rawLocationConnections
      .map((item, index) => normalizeLocationConnection(item, index))
      .filter(
        (item): item is WorldLocationConnectionRelation =>
          item !== null && locationIds.has(item.sourceLocationId) && locationIds.has(item.targetLocationId),
      )
    : fallback.relations.locationConnections ?? [];
  const sanitizedFactions = factions.map((item) => ({
    ...item,
    representativeForceIds: item.representativeForceIds.filter((id) => forceIds.has(id)),
  }));
  const sanitizedForces = forces.map((item) => ({
    ...item,
    controlledLocationIds: (item.controlledLocationIds ?? []).filter((id) => locationIds.has(id)),
  }));
  const sanitizedLocations = locations.map((item) => ({
    ...item,
    controllingForceIds: item.controllingForceIds.filter((id) => forceIds.has(id)),
  }));

  return {
    profile: normalizeProfile(record.profile, fallback.profile),
    rules: normalizeRules(record.rules, fallback.rules),
    factions: sanitizedFactions,
    forces: sanitizedForces,
    locations: sanitizedLocations,
    relations: {
      forceRelations: dedupeById(forceRelations),
      locationControls: dedupeById(locationControls),
      locationConnections: dedupeById(locationConnections),
    },
    metadata: {
      schemaVersion:
        Number(record.metadata && normalizeRecord(record.metadata).schemaVersion)
        || fallback.metadata.schemaVersion
        || WORLD_STRUCTURE_SCHEMA_VERSION,
      seededFrom: normalizeText(normalizeRecord(record.metadata).seededFrom, fallback.metadata.seededFrom ?? "") || null,
      lastBackfilledAt:
        normalizeText(normalizeRecord(record.metadata).lastBackfilledAt, fallback.metadata.lastBackfilledAt ?? "")
        || null,
      lastGeneratedAt:
        normalizeText(normalizeRecord(record.metadata).lastGeneratedAt, fallback.metadata.lastGeneratedAt ?? "")
        || null,
      lastSectionGenerated:
        (normalizeText(
          normalizeRecord(record.metadata).lastSectionGenerated,
          fallback.metadata.lastSectionGenerated ?? "",
        ) as WorldStructureSectionKey)
        || null,
    },
  };
}


export function parseWorldStructurePayload(
  structureJson: string | null | undefined,
  bindingSupportJson: string | null | undefined,
): {
  structure: WorldStructuredData;
  bindingSupport: WorldBindingSupport;
  hasStructuredData: boolean;
} {
  const hasStructuredData = Boolean(structureJson?.trim());
  const structure = normalizeWorldStructuredData(safeParseJSON<unknown>(structureJson, null));
  const bindingSupport = normalizeWorldBindingSupport(safeParseJSON<unknown>(bindingSupportJson, null));
  return { structure, bindingSupport, hasStructuredData };
}

