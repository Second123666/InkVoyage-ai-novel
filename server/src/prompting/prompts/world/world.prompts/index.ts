// world.prompts 模块门面:保持原 14 个 PromptAsset 的导出路径不变(RF-1)。
export {
  worldInspirationConceptCardLocalizationPrompt,
  worldInspirationConceptCardPrompt,
  worldReferenceInspirationPrompt,
} from "./worldReference.prompts";
export {
  worldDeepeningQuestionsPrompt,
  worldPropertyOptionsPrompt,
} from "./worldOptions.prompts";
export {
  novelThemeWorldGenerationPrompt,
  worldAxiomSuggestionPrompt,
  worldLayerGenerationPrompt,
  worldLayerLocalizationPrompt,
  worldStructureBackfillPrompt,
  worldStructureSectionPrompt,
} from "./worldGeneration.prompts";
export {
  worldConsistencyPrompt,
  worldImportExtractionPrompt,
  worldVisualizationPrompt,
} from "./worldQuality.prompts";
