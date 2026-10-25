import type { TaskStatus, UnifiedTaskSummary } from "@ai-novel/shared/types/task";

const WORKFLOW_PROXY_PIPELINE_STATUSES = new Set<TaskStatus>([
  "queued",
  "running",
  "waiting_approval",
  "succeeded",
]);

export function collectWorkflowLinkedPipelineIds(tasks: UnifiedTaskSummary[]): Set<string> {
  return new Set(
    tasks
      .filter((task) => task.kind === "novel_workflow" && WORKFLOW_PROXY_PIPELINE_STATUSES.has(task.status))
      .flatMap((task) =>
        (task.targetResources ?? [])
          .filter((resource) => resource.type === "generation_job")
          .map((resource) => resource.id)),
  );
}

export function parseLinkedPipelineJobId(seedPayloadJson?: string | null): string | null {
  if (!seedPayloadJson?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(seedPayloadJson) as {
      autoExecution?: {
        pipelineJobId?: unknown;
      },
    };
    return typeof parsed.autoExecution?.pipelineJobId === "string"
      && parsed.autoExecution.pipelineJobId.trim()
      ? parsed.autoExecution.pipelineJobId.trim()
      : null;
  } catch {
    return null;
  }
}

/**
 * BUG-8:overview 计数与列表可见性同源 —— 从工作流行直接解析被代理的 pipeline 作业 ID,
 * 使 overview 的 novel_pipeline 计数与「全部/章节流水线」列表使用同一条隐藏规则。
 */
export function collectLinkedPipelineJobIdsFromRows(
  rows: Array<{ status: string; seedPayloadJson: string | null }>,
): Set<string> {
  const linkedIds = new Set<string>();
  for (const row of rows) {
    if (!WORKFLOW_PROXY_PIPELINE_STATUSES.has(row.status as TaskStatus)) {
      continue;
    }
    const linkedId = parseLinkedPipelineJobId(row.seedPayloadJson);
    if (linkedId) {
      linkedIds.add(linkedId);
    }
  }
  return linkedIds;
}
