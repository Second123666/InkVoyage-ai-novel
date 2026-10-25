const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectWorkflowLinkedPipelineIds,
} = require("../dist/services/task/taskCenterVisibility.js");

test("collectWorkflowLinkedPipelineIds ignores failed and cancelled workflow wrappers", () => {
  const linkedIds = collectWorkflowLinkedPipelineIds([
    {
      id: "workflow-running",
      kind: "novel_workflow",
      status: "running",
      targetResources: [{ type: "generation_job", id: "job-running" }],
    },
    {
      id: "workflow-failed",
      kind: "novel_workflow",
      status: "failed",
      targetResources: [{ type: "generation_job", id: "job-failed" }],
    },
    {
      id: "workflow-cancelled",
      kind: "novel_workflow",
      status: "cancelled",
      targetResources: [{ type: "generation_job", id: "job-cancelled" }],
    },
  ]);

  assert.deepEqual([...linkedIds], ["job-running"]);
});

const fs = require("node:fs");
const path = require("node:path");

const {
  collectLinkedPipelineJobIdsFromRows,
  parseLinkedPipelineJobId,
} = require("../dist/services/task/taskCenterVisibility.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("parseLinkedPipelineJobId reads autoExecution.pipelineJobId from workflow seed payload", () => {
  assert.equal(
    parseLinkedPipelineJobId(JSON.stringify({ autoExecution: { pipelineJobId: "job-1" } })),
    "job-1",
  );
  assert.equal(parseLinkedPipelineJobId(JSON.stringify({ autoExecution: {} })), null);
  assert.equal(parseLinkedPipelineJobId("not-json"), null);
  assert.equal(parseLinkedPipelineJobId(null), null);
});

test("collectLinkedPipelineJobIdsFromRows applies the same proxy-status rule", () => {
  const linkedIds = collectLinkedPipelineJobIdsFromRows([
    { status: "running", seedPayloadJson: JSON.stringify({ autoExecution: { pipelineJobId: "job-running" } }) },
    { status: "failed", seedPayloadJson: JSON.stringify({ autoExecution: { pipelineJobId: "job-failed" } }) },
    { status: "succeeded", seedPayloadJson: JSON.stringify({ autoExecution: { pipelineJobId: "job-done" } }) },
    { status: "queued", seedPayloadJson: null },
  ]);
  assert.deepEqual([...linkedIds].sort(), ["job-done", "job-running"]);
});

test("BUG-8 同源可见性:overview 计数排除被代理的 pipeline 行,listTasks 无 kind 旁路", () => {
  const serviceSource = readSource("services", "task", "TaskCenterService.ts");

  assert.match(
    serviceSource,
    /collectLinkedPipelineJobIdsFromRows\(/,
    "overview 必须用同源函数收集被代理的 pipeline 行",
  );
  assert.match(
    serviceSource,
    /notIn: \[\.\.\.archivedPipelineIds, \.\.\.linkedPipelineJobIds\]/,
    "overview 的 novel_pipeline 计数必须排除被代理行",
  );
  assert.doesNotMatch(
    serviceSource,
    /filters\.kind === "novel_pipeline"\s*\?\s*novelTasks/,
    "listTasks 不得对 kind=novel_pipeline 保留隐藏旁路,否则切换筛选会出现任务凭空出现",
  );
});
