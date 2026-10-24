import type {
  BookSpec,
  DirectorCandidate,
  DirectorConfirmRequest,
  DirectorProjectContextInput,
  DirectorRunMode,
  DirectorTakeoverEntryReadiness,
  DirectorTakeoverEntryStep,
  DirectorTakeoverExecutableRangeSnapshot,
  DirectorTakeoverPipelineJobSnapshot,
  DirectorTakeoverPreview,
  DirectorTakeoverReadinessResponse,
  DirectorTakeoverStageReadiness,
  DirectorTakeoverStartPhase,
  DirectorTakeoverStrategy,
  DirectorTakeoverCheckpointSnapshot,
} from "@ai-novel/shared/types/novelDirector";
import { DIRECTOR_TAKEOVER_ENTRY_STEPS } from "@ai-novel/shared/types/novelDirector";
import type { NovelWorkflowStage, BookContract } from "@ai-novel/shared/types/novelWorkflow";
import type { StoryMacroPlan } from "@ai-novel/shared/types/storyMacro";
import { normalizeDirectorTargetChapterCount } from "../novelDirectorHelpers";

// 接管决策的共享类型与阶段/入口元信息(拆分自 novelDirectorTakeover.ts,RF-1)。
export interface DirectorTakeoverNovelContext extends Omit<DirectorProjectContextInput, "description"> {
  id: string;
  title: string;
  description?: string | null;
  commercialTags: string[];
}

export interface DirectorTakeoverAssetSnapshot {
  hasStoryMacroPlan: boolean;
  hasBookContract: boolean;
  hasWorldSetupPrepared: boolean;
  characterCount: number;
  chapterCount: number;
  plannedChapterCount?: number | null;
  volumeCount: number;
  hasVolumeStrategyPlan?: boolean;
  firstVolumeId: string | null;
  firstVolumeChapterCount: number;
  volumeChapterRanges?: Array<{
    volumeOrder: number;
    startOrder: number;
    endOrder: number;
  }>;
  structuredOutlineChapterOrders?: number[];
  firstVolumeBeatSheetReady?: boolean;
  firstVolumePreparedChapterCount?: number;
  structuredOutlineRecoveryStep?: "beat_sheet" | "chapter_list" | "chapter_detail_bundle" | "chapter_sync" | "completed" | null;
  generatedChapterCount?: number;
  approvedChapterCount?: number;
  pendingRepairChapterCount?: number;
  /**
   * 目标自动执行范围内是否仍有「未处理且缺少完整章节细化」的章节。
   * 为真时，继续模式应先回到节奏 / 拆章补齐细化，而非直接进入章节执行
   * （否则 runFromReady 会抛「缺少完整章节细化」并卡死）。
   */
  hasUnpreparedChaptersInRange?: boolean;
  /** 缺少完整细化的章节序（调试/展示用）。 */
  missingExecutionContractOrders?: number[];
}

export interface DirectorTakeoverDecisionInput {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  snapshot: DirectorTakeoverAssetSnapshot;
  activePipelineJob?: DirectorTakeoverPipelineJobSnapshot | null;
  latestCheckpoint?: DirectorTakeoverCheckpointSnapshot | null;
  executableRange?: DirectorTakeoverExecutableRangeSnapshot | null;
}

export interface DirectorTakeoverResolvedPlan {
  entryStep: DirectorTakeoverEntryStep;
  strategy: DirectorTakeoverStrategy;
  effectiveStep: DirectorTakeoverEntryStep;
  effectiveStage: NovelWorkflowStage;
  startPhase: DirectorTakeoverStartPhase;
  resumeStage: "basic" | "story_macro" | "world" | "character" | "outline" | "structured" | "chapter" | "pipeline";
  skipSteps: DirectorTakeoverEntryStep[];
  summary: string;
  effectSummary: string;
  impactNotes: string[];
  usesCurrentBatch: boolean;
  currentStep?: DirectorTakeoverEntryStep | null;
  restartStep?: DirectorTakeoverEntryStep | null;
  executionMode: "phase" | "auto_execution";
  phase?: DirectorTakeoverStartPhase;
  resumeCheckpointType?: "chapter_batch_ready" | "step_review_required" | "replan_required" | null;
}

export const DIRECTOR_TAKEOVER_STAGE_META: Record<
  DirectorTakeoverStartPhase,
  Pick<DirectorTakeoverStageReadiness, "label" | "description">
> = {
  story_macro: {
    label: "从故事宏观规划开始",
    description: "先补齐 Story Macro 和 Book Contract，再继续角色、卷战略和拆章。",
  },
  world_setup: {
    label: "从世界观准备开始",
    description: "沿用故事宏观规划，先完成本书世界观，再继续角色和后续规划。",
  },
  character_setup: {
    label: "从角色准备开始",
    description: "沿用已有书级方向，只让 AI 接手角色阵容和后续规划。",
  },
  volume_strategy: {
    label: "从卷战略开始",
    description: "沿用现有书级方向和角色，继续生成卷战略与卷骨架。",
  },
  structured_outline: {
    label: "从节奏 / 拆章开始",
    description: "沿用现有卷规划，继续生成节奏板、章节列表和章节细化。",
  },
};

export const TAKEOVER_ENTRY_META: Record<
  DirectorTakeoverEntryStep,
  {
    label: string;
    description: string;
  }
> = {
  basic: {
    label: "项目设定",
    description: "从现有项目基础信息继续接管，优先补最早缺失的导演前置资产。",
  },
  story_macro: {
    label: "故事宏观规划",
    description: "围绕 Story Macro 和 Book Contract 继续或重跑书级规划。",
  },
  world: {
    label: "世界观准备",
    description: "围绕本书世界规则、势力和约束继续或重跑当前步骤。",
  },
  character: {
    label: "角色准备",
    description: "围绕角色阵容与应用继续或重跑当前步骤。",
  },
  outline: {
    label: "卷战略",
    description: "围绕卷战略与卷骨架继续或重跑当前步骤。",
  },
  structured: {
    label: "节奏 / 拆章",
    description: "围绕当前卷节奏板、章节列表和细化资源继续或重跑当前步骤。",
  },
  chapter: {
    label: "章节执行",
    description: "优先恢复当前章节批次或从已准备范围继续执行。",
  },
  pipeline: {
    label: "质量修复",
    description: "优先恢复当前修复批次，或承接待修章节继续推进。",
  },
};
