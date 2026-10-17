import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildDisplayAutoDirectorTask,
  canArchiveCompletedAutoDirectorTask,
  resolveTakeoverDialogContextTaskId,
  resolveTakeoverModeFromAutomation,
  shouldPreserveRequestedDirectorTaskId,
  shouldAutofocusProjectedDirectorTask,
  shouldShowPinnedBookAutomationProjection,
} from "./novelEditAutomationStatus.ts";

const sharedTypesRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../shared/types");

const TASK_STATUS_CONTRACT = ["queued", "running", "waiting_approval", "succeeded", "failed", "cancelled"];

function readSharedUnionMembers(fileName, typeName) {
  const source = readFileSync(join(sharedTypesRoot, fileName), "utf8");
  const unionMatch = source.match(new RegExp(`export type ${typeName} =([\\s\\S]*?);`));
  assert.ok(unionMatch, `${typeName} should stay readable from shared/types/${fileName}`);
  return [...unionMatch[1].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
}

function buildTask(overrides = {}) {
  return {
    status: "succeeded",
    checkpointType: "workflow_completed",
    ...overrides,
  };
}

test("completed workflow auto director tasks can be archived from the editor", () => {
  assert.equal(canArchiveCompletedAutoDirectorTask(buildTask()), true);
});

test("non-completed workflow tasks are not archived by the completion action", () => {
  assert.equal(canArchiveCompletedAutoDirectorTask(buildTask({ status: "waiting_approval" })), false);
  assert.equal(canArchiveCompletedAutoDirectorTask(buildTask({ status: "failed" })), false);
  assert.equal(canArchiveCompletedAutoDirectorTask(buildTask({ checkpointType: "chapter_batch_ready" })), false);
});

test("replan checkpoints stay action-required even when projection reports waiting approval", () => {
  assert.equal(
    resolveTakeoverModeFromAutomation({
      task: buildTask({
        id: "task-replan",
        status: "waiting_approval",
        checkpointType: "replan_required",
      }),
      projection: {
        latestTask: { id: "task-replan" },
        status: "waiting_approval",
      },
    }),
    "action_required",
  );
});

test("failed projections auto-focus the latest task because they need attention", () => {
  assert.equal(
    shouldAutofocusProjectedDirectorTask({
      latestTask: { id: "task-failed", status: "failed" },
      status: "failed",
    }),
    true,
  );
});

test("blocked and recovery projections stay discoverable without a task id in the URL", () => {
  for (const status of ["blocked", "waiting_recovery"]) {
    const projection = {
      latestTask: { id: `task-${status}`, status: "running" },
      status,
    };
    assert.equal(shouldAutofocusProjectedDirectorTask(projection), true, status);
    assert.equal(
      resolveTakeoverDialogContextTaskId({
        directorTaskId: "",
        activeAutoDirectorTask: null,
        projection,
      }),
      `task-${status}`,
      status,
    );
  }
});

test("completed projections do not auto-focus old director tasks", () => {
  assert.equal(
    shouldAutofocusProjectedDirectorTask({
      latestTask: { id: "task-old" },
      status: "completed",
    }),
    false,
  );
});

test("live projections still auto-focus the active director task", () => {
  assert.equal(
    shouldAutofocusProjectedDirectorTask({
      latestTask: { id: "task-live" },
      status: "running",
    }),
    true,
  );
  assert.equal(
    shouldAutofocusProjectedDirectorTask({
      latestTask: { id: "task-gate" },
      status: "waiting_approval",
    }),
    true,
  );
});

test("takeover dialog context ignores manual workspace task ids", () => {
  assert.equal(
    resolveTakeoverDialogContextTaskId({
      directorTaskId: "",
      activeAutoDirectorTask: null,
      projection: {
        latestTask: { id: "task-completed", status: "succeeded" },
        status: "completed",
      },
    }),
    "",
  );
  assert.equal(
    resolveTakeoverDialogContextTaskId({
      directorTaskId: "task-pinned",
      activeAutoDirectorTask: { id: "task-active" },
      projection: {
        latestTask: { id: "task-live", status: "running" },
        status: "running",
      },
    }),
    "task-pinned",
  );
  assert.equal(
    resolveTakeoverDialogContextTaskId({
      directorTaskId: "",
      activeAutoDirectorTask: { id: "task-active" },
      projection: {
        latestTask: { id: "task-live", status: "running" },
        status: "running",
      },
    }),
    "task-active",
  );
  assert.equal(
    resolveTakeoverDialogContextTaskId({
      directorTaskId: "",
      activeAutoDirectorTask: null,
      projection: {
        latestTask: { id: "task-live", status: "running" },
        status: "running",
      },
    }),
    "task-live",
  );
});

test("failed tasks are not rewritten into waiting approval by stale projections", () => {
  const task = {
    id: "task-failed",
    status: "failed",
    pendingManualRecovery: false,
    currentItemLabel: "正在自动执行第 2-10 章",
    lastError: "指定区间内没有可生成的章节。",
    failureSummary: "指定区间内没有可生成的章节。",
  };
  const result = buildDisplayAutoDirectorTask(task, {
    latestTask: { id: "task-failed", status: "failed" },
    status: "waiting_approval",
    blockedReason: "该动作会自动推进较大范围的章节生成，需要确认后才能继续。",
    detail: "该动作会自动推进较大范围的章节生成，需要确认后才能继续。",
  });

  assert.equal(result.status, "failed");
  assert.equal(result.lastError, "指定区间内没有可生成的章节。");
});

test("requested failed director task stays pinned after the active task disappears", () => {
  assert.equal(
    shouldPreserveRequestedDirectorTaskId({
      directorTaskId: "task-failed",
      requestedTask: {
        id: "task-failed",
        status: "failed",
      },
    }),
    true,
  );
  assert.equal(
    shouldPreserveRequestedDirectorTaskId({
      directorTaskId: "task-cancelled",
      requestedTask: {
        id: "task-cancelled",
        status: "cancelled",
      },
    }),
    false,
  );
});

test("rail keeps the pinned failed projection visible without an active task", () => {
  assert.equal(
    shouldShowPinnedBookAutomationProjection({
      directorTaskId: "task-failed",
      projection: {
        latestTask: { id: "task-failed" },
        status: "failed",
      },
    }),
    true,
  );
  assert.equal(
    shouldShowPinnedBookAutomationProjection({
      directorTaskId: "task-other",
      projection: {
        latestTask: { id: "task-failed" },
        status: "failed",
      },
    }),
    false,
  );
});

test("editor task status mapping stays inside the unified task status contract", () => {
  const automationStatuses = readSharedUnionMembers("directorRuntime.ts", "DirectorBookAutomationStatus");
  assert.deepEqual(automationStatuses, [
    "idle",
    "queued",
    "running",
    "waiting_approval",
    "waiting_recovery",
    "blocked",
    "failed",
    "cancelled",
    "completed",
  ]);

  const emittedStatuses = new Set();
  for (const projectionStatus of automationStatuses) {
    const result = buildDisplayAutoDirectorTask(
      { id: "task-guard", status: "waiting_approval", pendingManualRecovery: false },
      { latestTask: { id: "task-guard", status: projectionStatus }, status: projectionStatus },
    );
    assert.ok(result, `${projectionStatus} projection should keep the task visible`);
    emittedStatuses.add(result.status);
    assert.ok(
      TASK_STATUS_CONTRACT.includes(result.status),
      `projection ${projectionStatus} must map into TaskStatus, received ${result.status}`,
    );
  }
  assert.deepEqual(
    [...emittedStatuses].sort(),
    [...TASK_STATUS_CONTRACT].sort(),
    "editor status vocabulary should cover the unified task status contract",
  );
});

test("editor recovery and blocked projections keep the task center degradation contract", () => {
  const recoveryTask = buildDisplayAutoDirectorTask(
    { id: "task-recovery", status: "queued", pendingManualRecovery: false },
    {
      latestTask: { id: "task-recovery", status: "running" },
      status: "waiting_recovery",
      blockedReason: "等待手动恢复",
    },
  );
  assert.equal(recoveryTask.status, "queued");
  assert.equal(recoveryTask.pendingManualRecovery, true);

  const blockedTask = buildDisplayAutoDirectorTask(
    { id: "task-blocked", status: "running", pendingManualRecovery: false },
    {
      latestTask: { id: "task-blocked", status: "running" },
      status: "blocked",
      blockedReason: "需要确认后继续",
    },
  );
  assert.equal(blockedTask.status, "failed");
});
