import type {
  WorldBindingSupport,
  WorldStructuredData,
} from "@ai-novel/shared/types/world";
import { makeId } from "./worldStructure.shared";

// worldStructure 投影:绑定支持,供世界工作站和绑定面板消费。
// 拆分自原 worldStructure.ts,行为不变(RF-1)。
export function buildWorldBindingSupport(structure: WorldStructuredData): WorldBindingSupport {
  const recommendedEntryPoints = Array.from(
    new Set(
      [
        ...structure.locations
          .filter((item) => item.narrativeFunction || item.summary)
          .slice(0, 3)
          .map((item) => `${item.name}${item.narrativeFunction ? `：${item.narrativeFunction}` : ""}`),
        ...structure.forces
          .filter((item) => item.narrativeRole || item.summary)
          .slice(0, 3)
          .map((item) => `${item.name}${item.narrativeRole ? `：${item.narrativeRole}` : ""}`),
      ].filter(Boolean),
    ),
  ).slice(0, 6);

  const highPressureForces = structure.forces
    .filter((item) => item.pressure)
    .map((item) => `${item.name}：${item.pressure}`)
    .slice(0, 6);

  const suggestedLocationClusters = structure.locations
    .slice(0, 3)
    .map((item, index) => ({
      id: makeId("cluster", index, item.name),
      label: `${item.name} 场景群`,
      locationIds: [item.id],
      reason: item.narrativeFunction || item.summary || item.risk,
    }));

  const compatibleConflicts = Array.from(
    new Set(
      structure.relations.forceRelations
        .map((item) => item.detail || item.tension || `${item.sourceForceId} ${item.relation} ${item.targetForceId}`)
        .filter(Boolean),
    ),
  ).slice(0, 8);

  const forbiddenCombinations = [
    ...structure.rules.taboo,
    ...structure.rules.sharedConsequences.map((item) => `避免忽略：${item}`),
  ].slice(0, 8);

  return {
    recommendedEntryPoints,
    highPressureForces,
    suggestedLocationClusters,
    compatibleConflicts,
    forbiddenCombinations,
  };
}

