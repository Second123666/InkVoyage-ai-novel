import type { World as PrismaWorld } from "@prisma/client";
import type {
  WorldBindingSupport,
  WorldForceRelation,
  WorldLocationConnectionRelation,
  WorldLocationControlRelation,
  WorldProfile,
  WorldRule,
  WorldRules,
  WorldStructuredData,
} from "@ai-novel/shared/types/world";

// worldStructure 共享常量、类型与纯工具(JSON/文本/ID/去重/规则文本)。
// 拆分自原 worldStructure.ts,行为不变(RF-1)。
export const WORLD_STRUCTURE_SCHEMA_VERSION = 1;

export type WorldStructureSource = Pick<
  PrismaWorld,
  | "id"
  | "name"
  | "worldType"
  | "description"
  | "overviewSummary"
  | "axioms"
  | "background"
  | "geography"
  | "cultures"
  | "magicSystem"
  | "politics"
  | "races"
  | "religions"
  | "technology"
  | "conflicts"
  | "history"
  | "economy"
  | "factions"
  | "selectedElements"
  | "structureJson"
  | "bindingSupportJson"
  | "structureSchemaVersion"
>;

export function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function normalizeText(raw: unknown, fallback = ""): string {
  if (typeof raw === "string") {
    return raw.trim();
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeText(item)).filter(Boolean).join(" / ");
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const key of ["summary", "description", "content", "text", "value", "name", "title", "label"]) {
      const value = normalizeText(record[key]);
      if (value) {
        return value;
      }
    }
  }
  return fallback;
}

export function normalizeStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map((item) => normalizeText(item)).filter(Boolean)));
  }
  if (typeof raw === "string") {
    return Array.from(
      new Set(
        raw
          .split(/[\n,，;；]/)
          .map((item) => item.replace(/^[-*]\s*/, "").trim())
          .filter(Boolean),
      ),
    );
  }
  return [];
}

export function normalizeRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "item";
}

export function makeId(prefix: string, index: number, preferred?: string): string {
  const suffix = preferred ? slugify(preferred) : String(index + 1);
  return `${prefix}-${suffix}`;
}

export function parseListText(raw: string | null | undefined): string[] {
  return normalizeStringArray(raw ?? "");
}

function parseLegacyJSON(raw: string | null | undefined): unknown {
  return safeParseJSON<unknown>(raw, null);
}

export function parseLegacyArray(raw: string | null | undefined, preferredKeys: string[] = []): unknown[] | null {
  const parsed = parseLegacyJSON(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  const record = normalizeRecord(parsed);
  for (const key of preferredKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

export function parseLegacyObject(raw: string | null | undefined): Record<string, unknown> {
  return normalizeRecord(parseLegacyJSON(raw));
}

export function parseAxiomStrings(raw: string | null | undefined): string[] {
  const parsed = safeParseJSON<unknown>(raw, null);
  if (Array.isArray(parsed)) {
    return parsed
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }
  return parseListText(raw);
}

export function buildRuleFromText(text: string, index: number): WorldRule {
  const normalized = text.trim();
  const [name, summary] = normalized.split(/[：:]/, 2);
  return {
    id: makeId("rule", index, name || normalized),
    name: (summary ? name : `规则 ${index + 1}`).trim(),
    summary: (summary ?? normalized).trim(),
    cost: "",
    boundary: "",
    enforcement: "",
  };
}


export function buildStructuredRulesFromAxiomTexts(axiomTexts: string[]): WorldRule[] {
  return axiomTexts
    .map((text, index) => buildRuleFromText(text, index))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.name === item.name) === index);
}

export function createEmptyWorldProfile(): WorldProfile {
  return {
    summary: "",
    identity: "",
    tone: "",
    themes: [],
    coreConflict: "",
  };
}

export function createEmptyWorldRules(): WorldRules {
  return {
    summary: "",
    axioms: [],
    taboo: [],
    sharedConsequences: [],
  };
}

export function createEmptyWorldRelations() {
  return {
    forceRelations: [] as WorldForceRelation[],
    locationControls: [] as WorldLocationControlRelation[],
    locationConnections: [] as WorldLocationConnectionRelation[],
  };
}

export function createEmptyWorldStructure(): WorldStructuredData {
  return {
    profile: createEmptyWorldProfile(),
    rules: createEmptyWorldRules(),
    factions: [],
    forces: [],
    locations: [],
    relations: createEmptyWorldRelations(),
    metadata: {
      schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
      seededFrom: "empty",
      lastBackfilledAt: null,
      lastGeneratedAt: null,
      lastSectionGenerated: null,
    },
  };
}

export function createEmptyWorldBindingSupport(): WorldBindingSupport {
  return {
    recommendedEntryPoints: [],
    highPressureForces: [],
    suggestedLocationClusters: [],
    compatibleConflicts: [],
    forbiddenCombinations: [],
  };
}


export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}


export function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.name, item])).values());
}


export function formatRuleText(rule: WorldRule): string {
  const parts = [rule.summary, rule.cost && `代价：${rule.cost}`, rule.boundary && `边界：${rule.boundary}`, rule.enforcement && `约束：${rule.enforcement}`]
    .filter(Boolean);
  return `${rule.name}${parts.length > 0 ? `：${parts.join("；")}` : ""}`;
}
