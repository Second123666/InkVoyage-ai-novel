import type {
  NovelWorkflowCheckpoint,
  NovelWorkflowLane,
  NovelWorkflowMilestone,
  NovelWorkflowMilestoneType,
  NovelWorkflowResumeTarget,
  NovelWorkflowStage,
} from "@ai-novel/shared/types/novelWorkflow";
import { getNovelWorkflowLaneDescriptor } from "@ai-novel/shared/types/novelWorkflow";

export const NOVEL_WORKFLOW_STAGE_LABELS: Record<NovelWorkflowStage, string> = {
  project_setup: "项目设定",
  creation_intent: "理解创作想法",
  short_story_plan: "规划短篇",
  short_story_draft: "生成完整作品",
  short_story_review: "全篇审校",
  auto_director: "AI 自动导演",
  story_macro: "故事宏观规划",
  world_setup: "世界观准备",
  character_setup: "角色准备",
  volume_strategy: "卷战略 / 卷骨架",
  structured_outline: "节奏 / 拆章",
  chapter_execution: "章节执行",
  quality_repair: "质量修复",
};

export const NOVEL_WORKFLOW_STAGE_PROGRESS: Record<NovelWorkflowStage, number> = {
  project_setup: 0.08,
  creation_intent: 0.08,
  short_story_plan: 0.2,
  short_story_draft: 0.35,
  short_story_review: 0.9,
  auto_director: 0.15,
  story_macro: 0.26,
  world_setup: 0.34,
  character_setup: 0.42,
  volume_strategy: 0.5,
  structured_outline: 0.68,
  chapter_execution: 0.84,
  quality_repair: 0.94,
};

export const NOVEL_WORKFLOW_STAGE_STEPS = [
  { key: "project_setup", label: "项目设定" },
  { key: "creation_intent", label: "理解创作想法" },
  { key: "short_story_plan", label: "规划短篇" },
  { key: "short_story_draft", label: "生成完整作品" },
  { key: "short_story_review", label: "全篇审校" },
  { key: "auto_director", label: "自动导演" },
  { key: "story_macro", label: "故事宏观规划" },
  { key: "world_setup", label: "世界观准备" },
  { key: "character_setup", label: "角色准备" },
  { key: "volume_strategy", label: "卷战略 / 卷骨架" },
  { key: "structured_outline", label: "节奏 / 拆章" },
  { key: "chapter_execution", label: "章节执行" },
  { key: "quality_repair", label: "质量修复" },
] as const;

export function buildNovelCreateResumeTarget(taskId: string, mode: "director" | null = null): NovelWorkflowResumeTarget {
  return {
    route: "/novels/create",
    taskId,
    mode,
  };
}

export function buildCreationStudioResumeTarget(taskId: string): NovelWorkflowResumeTarget {
  return {
    route: "/create",
    taskId,
    lane: "creation_studio",
  };
}

export function buildShortStoryResumeTarget(novelId: string, taskId?: string | null): NovelWorkflowResumeTarget {
  return {
    route: "/novels/:id/story",
    novelId,
    taskId: taskId ?? null,
    lane: "creation_studio",
  };
}

export function buildNovelEditResumeTarget(params: {
  novelId: string;
  taskId?: string | null;
  lane?: NovelWorkflowResumeTarget["lane"];
  stage: NovelWorkflowResumeTarget["stage"];
  chapterId?: string | null;
  volumeId?: string | null;
}): NovelWorkflowResumeTarget {
  return {
    route: "/novels/:id/edit",
    novelId: params.novelId,
    taskId: params.taskId ?? null,
    lane: params.lane ?? null,
    stage: params.stage,
    chapterId: params.chapterId ?? null,
    volumeId: params.volumeId ?? null,
  };
}

export interface NovelWorkflowSourceRouteContext {
  taskId?: string | null;
  creationExperience?: "simple" | "professional" | null;
}

export function resumeTargetToRoute(
  target: NovelWorkflowResumeTarget | null | undefined,
  context: NovelWorkflowSourceRouteContext = {},
): string {
  // Fall back to the task center deep link so a route-less task still lands on its own record.
  const taskFallbackRoute = context.taskId
    ? `/tasks?kind=novel_workflow&id=${encodeURIComponent(context.taskId)}`
    : "/tasks";
  if (!target) {
    return taskFallbackRoute;
  }
  if (target.route === "/create") {
    return target.taskId ? `/create?taskId=${encodeURIComponent(target.taskId)}` : "/create";
  }
  if (target.route === "/novels/create") {
    if (target.mode === "director") {
      const searchParams = new URLSearchParams();
      if (target.taskId) {
        searchParams.set("taskId", target.taskId);
      }
      const query = searchParams.toString();
      return query ? `/novels/auto-director?${query}` : "/novels/auto-director";
    }
    const searchParams = new URLSearchParams();
    if (target.taskId) {
      searchParams.set("workflowTaskId", target.taskId);
    }
    if (target.mode) {
      searchParams.set("mode", target.mode);
    }
    const query = searchParams.toString();
    return query ? `/novels/create?${query}` : "/novels/create";
  }

  if (!target.novelId) {
    return taskFallbackRoute;
  }

  // The simple creation experience opens the reading shelf instead of the full edit workspace.
  if (target.route === "/novels/:id/simple"
    || (target.route === "/novels/:id/edit" && context.creationExperience === "simple")) {
    return `/novels/${target.novelId}/simple`;
  }

  if (target.route === "/novels/:id/story") {
    return `/novels/${target.novelId}/story`;
  }

  const searchParams = new URLSearchParams();
  if (target.stage) {
    searchParams.set("stage", target.stage);
  }
  if (target.taskId) {
    if (target.lane === "manual_create") {
      searchParams.set("workspaceTaskId", target.taskId);
    } else {
      searchParams.set("directorTaskId", target.taskId);
    }
  }
  if (target.chapterId) {
    searchParams.set("chapterId", target.chapterId);
  }
  if (target.volumeId) {
    searchParams.set("volumeId", target.volumeId);
  }
  const query = searchParams.toString();
  return query ? `/novels/${target.novelId}/edit?${query}` : `/novels/${target.novelId}/edit`;
}

export function buildNovelWorkflowSourceRoute(input: {
  id: string;
  checkpointType?: string | null;
  currentItemKey?: string | null;
  resumeTargetJson?: string | null;
  seedPayloadJson?: string | null;
  creationExperience?: "simple" | "professional" | null;
}): string {
  // Single sourceRoute constructor shared by the task center and the recovery candidates so
  // both surfaces always route the same director task to the same page.
  const resumeTarget = normalizeWorkflowResumeTargetForCandidateSelection({
    id: input.id,
    checkpointType: input.checkpointType ?? null,
    currentItemKey: input.currentItemKey ?? null,
    resumeTargetJson: input.resumeTargetJson ?? null,
    seedPayloadJson: input.seedPayloadJson,
  });
  return resumeTargetToRoute(resumeTarget, {
    taskId: input.id,
    creationExperience: input.creationExperience ?? null,
  });
}

export function parseMilestones(value: string | null | undefined): NovelWorkflowMilestone[] {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item): item is NovelWorkflowMilestone => (
        Boolean(item)
        && typeof item === "object"
        && typeof (item as NovelWorkflowMilestone).checkpointType === "string"
        && typeof (item as NovelWorkflowMilestone).summary === "string"
        && typeof (item as NovelWorkflowMilestone).createdAt === "string"
      ));
  } catch {
    return [];
  }
}

export function appendMilestone(
  existing: string | null | undefined,
  checkpointType: NovelWorkflowMilestoneType,
  summary: string,
): string {
  const next = [
    ...parseMilestones(existing).filter((item) => item.checkpointType !== checkpointType),
    {
      checkpointType,
      summary,
      createdAt: new Date().toISOString(),
    },
  ];
  return JSON.stringify(next);
}

export function parseResumeTarget(value: string | null | undefined): NovelWorkflowResumeTarget | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(value) as NovelWorkflowResumeTarget;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function stringifyResumeTarget(value: NovelWorkflowResumeTarget | null | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

export function parseSeedPayload<T>(value: string | null | undefined): T | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

interface CandidateSelectionSeedPayloadShape {
  candidateStage?: unknown;
  directorSession?: { phase?: unknown } | null;
}

function mergeResumeTargets(
  primary: NovelWorkflowResumeTarget | null,
  fallback: NovelWorkflowResumeTarget | null,
): NovelWorkflowResumeTarget | null {
  if (!primary) {
    return fallback;
  }
  if (!fallback) {
    return primary;
  }
  return {
    ...fallback,
    ...primary,
    stage: primary.stage === "basic" && fallback.stage !== "basic"
      ? fallback.stage
      : primary.stage,
    chapterId: primary.chapterId ?? fallback.chapterId ?? null,
    volumeId: primary.volumeId ?? fallback.volumeId ?? null,
  };
}

function hasCandidateSelectionPhase(seedPayloadJson?: string | null): boolean {
  const seedPayload = parseSeedPayload<CandidateSelectionSeedPayloadShape>(seedPayloadJson);
  if (!seedPayload) {
    return false;
  }
  if (seedPayload.candidateStage) {
    return true;
  }
  const phase = seedPayload.directorSession && typeof seedPayload.directorSession === "object"
    ? seedPayload.directorSession.phase
    : null;
  return phase === "candidate_selection";
}

export function normalizeWorkflowResumeTargetForCandidateSelection(input: {
  id: string;
  checkpointType: string | null;
  currentItemKey: string | null;
  resumeTargetJson: string | null;
  seedPayloadJson?: string | null;
}): NovelWorkflowResumeTarget | null {
  const seedResumeTarget = parseSeedPayload<{ resumeTarget?: unknown }>(input.seedPayloadJson)?.resumeTarget;
  const parsed = mergeResumeTargets(
    parseResumeTarget(input.resumeTargetJson),
    typeof seedResumeTarget === "string"
      ? parseResumeTarget(seedResumeTarget)
      : (seedResumeTarget && typeof seedResumeTarget === "object"
        ? seedResumeTarget as NovelWorkflowResumeTarget
        : null),
  );
  const isCandidateSelectionTask = input.checkpointType === "candidate_selection_required"
    || input.currentItemKey === "auto_director"
    || input.currentItemKey?.startsWith("candidate_") === true
    || hasCandidateSelectionPhase(input.seedPayloadJson);
  if (!isCandidateSelectionTask) {
    return parsed;
  }
  return buildNovelCreateResumeTarget(input.id, "director");
}

export function mergeSeedPayload<T extends Record<string, unknown>>(
  existing: string | null | undefined,
  patch: Partial<T>,
): string {
  const current = parseSeedPayload<T>(existing) ?? {} as T;
  return JSON.stringify({
    ...current,
    ...patch,
  });
}

export function defaultWorkflowTitle(input: {
  lane: NovelWorkflowLane;
  title?: string | null;
  novelTitle?: string | null;
}): string {
  const novelTitle = input.novelTitle?.trim() || input.title?.trim();
  if (novelTitle) {
    return novelTitle;
  }
  return getNovelWorkflowLaneDescriptor(input.lane).defaultTitle;
}
