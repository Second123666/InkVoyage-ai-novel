const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// BUG-6:拆书步骤词表必须覆盖全部 BookAnalysisStage,
// 否则中段进度(currentStage=loading_cache/generating_overview)在任务中心步骤索引回落。
const { BOOK_ANALYSIS_STEPS, buildSteps } = require("../dist/services/task/taskCenter.shared.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("BOOK_ANALYSIS_STEPS covers every persisted BookAnalysisStage", () => {
  const stageSource = readSource("services", "bookAnalysis", "shared", "bookAnalysis.types.ts");
  const typeMatch = stageSource.match(/export type BookAnalysisStage =([^;]+);/);
  assert.ok(typeMatch, "BookAnalysisStage 类型必须存在");
  const stages = typeMatch[1]
    .split("|")
    .map((value) => value.trim().replace(/"/g, ""))
    .filter(Boolean);

  const stepKeys = BOOK_ANALYSIS_STEPS.map((step) => step.key);
  for (const stage of stages) {
    assert.ok(stepKeys.includes(stage), `步骤词表缺少阶段 ${stage}`);
  }
});

test("buildSteps maps mid-analysis stages to the correct index", () => {
  const loadingCache = buildSteps(BOOK_ANALYSIS_STEPS, "running", "loading_cache", "2026-10-25T00:00:00Z", "2026-10-25T00:00:00Z");
  assert.equal(loadingCache[1].key, "loading_cache");
  assert.equal(loadingCache[1].status, "running");
  assert.equal(loadingCache[0].status, "succeeded");

  const overview = buildSteps(BOOK_ANALYSIS_STEPS, "running", "generating_overview", "2026-10-25T00:00:00Z", "2026-10-25T00:00:00Z");
  assert.equal(overview[3].key, "generating_overview");
  assert.equal(overview[3].status, "running");
  assert.equal(overview[1].status, "succeeded", "之前的缓存读取步骤应已完成");
});
