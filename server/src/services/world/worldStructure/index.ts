// worldStructure 模块门面:外部模块只从这里消费,不深入内部文件(RF-1)。
export {
  WORLD_STRUCTURE_SCHEMA_VERSION,
  buildStructuredRulesFromAxiomTexts,
  createEmptyWorldBindingSupport,
  createEmptyWorldProfile,
  createEmptyWorldRelations,
  createEmptyWorldRules,
  createEmptyWorldStructure,
} from "./worldStructure.shared";
export type { WorldStructureSource } from "./worldStructure.shared";
export {
  normalizeWorldBindingSupport,
  normalizeWorldStructuredData,
  parseWorldStructurePayload,
} from "./worldStructure.normalize";
export {
  applyStructuredWorldToLegacyFields,
  buildWorldStructureFromLegacySource,
  buildWorldStructureOverview,
  buildWorldStructureSeedFromSource,
} from "./worldStructure.legacy";
export { buildWorldBindingSupport } from "./worldStructure.projection";
