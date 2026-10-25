const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// BUG-5:任务阶段词表中英混写守卫 —— 步骤解析必须同时命中 key 与 label,
// 写入点统一走 NOVEL_WORKFLOW_STAGE_LABELS,不再混入英文 key。
const { buildSteps } = require("../dist/services/task/taskCenter.shared.js");
const { NOVEL_WORKFLOW_STAGE_STEPS } = require("../dist/services/novel/workflow/novelWorkflow.shared.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("buildSteps resolves workflow stage by English key", () => {
  const steps = buildSteps(
    NOVEL_WORKFLOW_STAGE_STEPS,
    "running",
    "chapter_execution",
    "2026-10-25T00:00:00Z",
    "2026-10-25T00:00:00Z",
  );
  const running = steps.find((step) => step.status === "running");
  assert.equal(running.key, "chapter_execution");
});

test("buildSteps resolves workflow stage by Chinese label (存量中英混写兼容)", () => {
  const steps = buildSteps(
    NOVEL_WORKFLOW_STAGE_STEPS,
    "running",
    "章节执行",
    "2026-10-25T00:00:00Z",
    "2026-10-25T00:00:00Z",
  );
  const running = steps.find((step) => step.status === "running");
  assert.equal(running.key, "chapter_execution");
  assert.equal(steps[0].status, "succeeded", "之前的步骤应已完成");
});

test("buildSteps falls back to first step on unknown stage values", () => {
  const steps = buildSteps(
    NOVEL_WORKFLOW_STAGE_STEPS,
    "running",
    "不存在的阶段",
    "2026-10-25T00:00:00Z",
    "2026-10-25T00:00:00Z",
  );
  assert.equal(steps[0].status, "running");
});

test("workflow currentStage 写入点统一走中文标签,不再混入英文 key", () => {
  const commandsDir = path.join(repoRoot, "src", "services", "novel", "director", "commands");
  const files = fs.readdirSync(commandsDir).filter((name) => name.endsWith(".ts"));
  const rawKeyWrites = [];
  for (const name of files) {
    const source = readSource("services", "novel", "director", "commands", name);
    if (/currentStage:\s*"(project_setup|creation_intent|story_macro|world_setup|character_setup|volume_strategy|structured_outline|chapter_execution|quality_repair|auto_director)"/.test(source)) {
      rawKeyWrites.push(name);
    }
  }
  assert.deepEqual(rawKeyWrites, [], `currentStage 不得写入英文阶段 key,应使用 NOVEL_WORKFLOW_STAGE_LABELS:${rawKeyWrites.join(", ")}`);

  const experienceSource = readSource("services", "novel", "director", "commands", "DirectorProductionExperienceService.ts");
  assert.match(experienceSource, /NOVEL_WORKFLOW_STAGE_LABELS\.chapter_execution/, "生产体验写入必须使用标签映射");
});
