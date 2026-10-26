const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// BUG-7 守卫:待手动恢复标记只能由显式用户恢复动作清除。
const SRC = path.join(__dirname, "..", "src");

function read(relativePath) {
  return fs.readFileSync(path.join(SRC, relativePath), "utf8");
}

function walkTypescriptFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkTypescriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

const EXPLICIT_RECOVERY_FILES = new Set([
  "services/novel/director/http/novelDirector.ts",
  "services/novel/director/http/novelWorkflows.ts",
  "services/novel/director/commands/DirectorProductionExperienceService.ts",
  "services/task/autoDirectorFollowUps/AutoDirectorFollowUpActionExecutor.ts",
  "services/task/adapters/NovelWorkflowTaskAdapter.ts",
  "services/task/RecoveryTaskService.ts",
]);

test("markCommandAcceptedOnTask 默认保留 pendingManualRecovery", () => {
  const source = read("services/novel/director/commands/DirectorCommandService.ts");
  assert.match(
    source,
    /clearPendingManualRecovery = options\.clearPendingManualRecovery === true/,
    "只有显式传 true 才清除标记",
  );
  assert.match(
    source,
    /clearPendingManualRecovery \? \{ pendingManualRecovery: false \} : \{\}/,
    "更新数据必须按显式选项条件携带 pendingManualRecovery: false",
  );
  assert.doesNotMatch(
    source,
    /data:\s*\{\s*status: "queued",\s*pendingManualRecovery: false,/,
    "不得无条件清除 pendingManualRecovery",
  );
});

test("只有显式用户恢复动作可以清除 pendingManualRecovery", () => {
  const offenders = [];
  for (const filePath of walkTypescriptFiles(SRC)) {
    const source = fs.readFileSync(filePath, "utf8");
    if (!source.includes("clearPendingManualRecovery: true")) {
      continue;
    }
    const relativePath = path.relative(SRC, filePath).replace(/\\/g, "/");
    if (!EXPLICIT_RECOVERY_FILES.has(relativePath)) {
      offenders.push(relativePath);
    }
  }
  assert.deepEqual(offenders, [], "清除标记只允许出现在显式用户恢复入口");

  for (const relativePath of EXPLICIT_RECOVERY_FILES) {
    assert.match(read(relativePath), /clearPendingManualRecovery: true/, `${relativePath} 必须显式标记用户恢复`);
  }

  assert.doesNotMatch(
    read("agents/tools/directorRuntimeTools.ts"),
    /clearPendingManualRecovery/,
    "agent 工具入队不得清除待手动恢复标记",
  );
  assert.doesNotMatch(
    read("services/novel/workflow/NovelWorkflowRuntimeService.ts"),
    /clearPendingManualRecovery/,
    "后台自动恢复不得清除待手动恢复标记",
  );
});

test("用户命令入口覆盖 continue/恢复/重试/审批/接管", () => {
  const directorHttp = read("services/novel/director/http/novelDirector.ts");
  const explicitCount = directorHttp.match(/clearPendingManualRecovery: true/g)?.length ?? 0;
  assert.ok(explicitCount >= 6, `导演命令入口至少覆盖 6 个显式恢复动作,当前 ${explicitCount}`);

  const workflowsHttp = read("services/novel/director/http/novelWorkflows.ts");
  assert.ok(
    (workflowsHttp.match(/clearPendingManualRecovery: true/g)?.length ?? 0) >= 2,
    "工作流 continue 的 approve/continue 两条路径都必须视为用户恢复",
  );
});
