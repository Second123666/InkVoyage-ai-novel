// novelDirectorTakeover 模块门面:只导出原公共 API(RF-1)。
export type {
  DirectorTakeoverAssetSnapshot,
  DirectorTakeoverDecisionInput,
  DirectorTakeoverNovelContext,
  DirectorTakeoverResolvedPlan,
} from "./takeoverTypes";
export { buildDirectorTakeoverInput } from "./takeoverInput";
export { isTakeoverStructuredOutlineReadyForValidation } from "./takeoverSnapshot";
export {
  buildSkipSteps,
  entryStepToLegacyStartPhase,
  entryStepToWorkflowStage,
  phaseToEntryStep,
} from "./takeoverMapping";
export { resolveDirectorTakeoverPlan } from "./takeoverPlan";
export {
  assertDirectorTakeoverPhaseAvailable,
  buildDirectorTakeoverReadiness,
} from "./takeoverReadiness";
export { buildTakeoverBookSpec } from "./takeoverBookSpec";
