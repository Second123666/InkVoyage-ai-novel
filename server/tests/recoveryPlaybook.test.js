const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-B4 失败模式 → 恢复动作知识库守卫(LOOP-12 · docs/plans/recovery-playbook.md)
require("../dist/app.js");
const {
  listRecoveryPlaybook,
  resolveRecoveryGuidance,
} = require("../dist/services/task/recoveryPlaybook.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

const EXPECTED_CODES = [
  "manual_recovery_required",
  "PIPELINE_FAILED",
  "PIPELINE_CANCELLED",
  "PIPELINE_EXECUTION_LEASE_LOST",
  "PIPELINE_QUALITY_REVIEW",
  "PIPELINE_REPLAN_REQUIRED",
  "CHAPTER_TITLE_DIVERSITY",
  "CHAPTER_EMPTY_CONTENT",
  "NOVEL_WORKFLOW_FAILED",
  "STYLE_EXTRACTION_FAILED",
  "STYLE_EXTRACTION_TASK_CANCELLED",
  "IMAGE_GENERATION_FAILED",
  "IMAGE_TASK_CANCELLED",
  "BOOK_ANALYSIS_FAILED",
  "BOOK_ANALYSIS_CANCELLED",
  "draft_generation_failed",
  "draft_obligation_unmet",
  "draft_repair_exhausted",
  "replan_required",
  "unknown_failure",
];

test("知识库覆盖全部既有结构化失败码,且条目形状合法", () => {
  const { entries } = listRecoveryPlaybook();
  const codes = entries.map((entry) => entry.code.toLowerCase());
  for (const expected of EXPECTED_CODES) {
    assert.ok(codes.includes(expected.toLowerCase()), `缺少失败码指引:${expected}`);
  }
  assert.equal(new Set(codes).size, codes.length, "失败码不得重复登记");
  for (const entry of entries) {
    assert.ok(entry.label.trim(), `${entry.code} 缺少 label`);
    assert.ok(entry.explanation.trim(), `${entry.code} 缺少 explanation`);
    assert.ok(entry.recommendedActions.length > 0, `${entry.code} 必须给出至少一条恢复动作`);
    assert.ok(["auto_retry", "user_action", "replan", "inspect"].includes(entry.mode), `${entry.code} mode 非法`);
    assert.equal(typeof entry.retryable, "boolean");
  }
});

test("解析优先级:人工恢复 > failureCode > noticeCode > classification > 兜底", () => {
  assert.equal(
    resolveRecoveryGuidance({ failureCode: "PIPELINE_FAILED", pendingManualRecovery: true })?.code,
    "manual_recovery_required",
    "人工恢复语义最高优先,不被具体失败码覆盖",
  );
  assert.equal(
    resolveRecoveryGuidance({ failureCode: "pipeline_failed" })?.code,
    "PIPELINE_FAILED",
    "失败码大小写不敏感",
  );
  assert.equal(
    resolveRecoveryGuidance({ failureCode: "SOMETHING_NEW", noticeCode: "PIPELINE_REPLAN_REQUIRED" })?.code,
    "PIPELINE_REPLAN_REQUIRED",
    "未知 failureCode 时回退 noticeCode",
  );
  assert.equal(
    resolveRecoveryGuidance({ failureClassificationCode: "draft_repair_exhausted" })?.code,
    "draft_repair_exhausted",
    "章节失败分类码同样可解析",
  );
  assert.equal(
    resolveRecoveryGuidance({ failureCode: "TOTALLY_UNKNOWN" })?.code,
    "unknown_failure",
    "未知码给兜底指引",
  );
  assert.equal(resolveRecoveryGuidance({}), null, "无任何结构化信号时不注入指引");
  assert.equal(
    resolveRecoveryGuidance({ failureCode: "  ", noticeCode: null, pendingManualRecovery: false }),
    null,
    "空白码不触发兜底",
  );
});

test("语义抽样:质量提醒/重规划/可重试标记正确", () => {
  assert.equal(resolveRecoveryGuidance({ failureCode: "PIPELINE_QUALITY_REVIEW" })?.mode, "inspect");
  assert.equal(resolveRecoveryGuidance({ failureCode: "PIPELINE_QUALITY_REVIEW" })?.retryable, false, "质量债≠失败,不标可重试");
  assert.equal(resolveRecoveryGuidance({ failureCode: "PIPELINE_REPLAN_REQUIRED" })?.mode, "replan");
  assert.equal(resolveRecoveryGuidance({ failureCode: "PIPELINE_EXECUTION_LEASE_LOST" })?.mode, "auto_retry");
  assert.equal(resolveRecoveryGuidance({ failureCode: "PIPELINE_FAILED" })?.retryable, true);
});

test("静态契约:任务详情装饰、只读端点与共享字段", () => {
  const service = readSource("services", "task", "TaskCenterService.ts");
  assert.match(service, /resolveRecoveryGuidance\(/, "任务中心详情必须附加恢复指引");
  assert.match(service, /recoveryGuidance \? \{ \.\.\.detail, recoveryGuidance \} : detail/, "装饰必须为加法,不覆盖既有字段");

  const route = readSource("routes", "recoveryPlaybook.ts");
  assert.match(route, /recoveryPlaybookRouter\.get\("\/"/, "目录端点必须是只读 GET");
  assert.doesNotMatch(route, /\.(post|patch|put|delete)\(/, "目录端点不得提供写操作");

  const app = readSource("app.ts");
  assert.match(app, /app\.use\("\/api\/recovery-playbook", recoveryPlaybookRouter\)/, "目录端点必须挂载");

  const sharedTask = fs.readFileSync(path.resolve(repoRoot, "..", "shared", "types", "task.ts"), "utf8");
  assert.match(sharedTask, /recoveryGuidance\?: RecoveryPlaybookEntry \| null/, "UnifiedTaskDetail 必须声明可选恢复指引字段");
});
