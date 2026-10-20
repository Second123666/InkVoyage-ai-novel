const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// INN-A2 全书一致性守卫守卫(LOOP-7 · docs/plans/continuity-guard.md)
require("../dist/app.js");
const {
  CONTINUITY_GUARD_CODES,
  MAX_CONTINUITY_ISSUES_PER_REPORT,
  isContinuityGuardCode,
  normalizeContinuityGuardIssues,
} = require("../dist/services/audit/continuityGuard.js");
const { buildRuntimePackage } = require("../dist/services/novel/runtime/chapterRuntimePackageBuilders.js");
const { getRegisteredPromptAsset } = require("../dist/prompting/registry.js");
const { NOVEL_PROMPT_BUDGETS } = require("../dist/prompting/prompts/novel/promptBudgetProfiles.js");

const repoRoot = path.resolve(__dirname, "..");

function guardIssue(overrides = {}) {
  return {
    severity: "high",
    code: "continuity_world_rule_conflict",
    description: "正文违反世界规则：灵气复苏前不可施展法术。",
    evidence: "世界规则写明“灵气复苏前任何人不能直接施法”，正文第 3 段主角直接施法。",
    fixSuggestion: "改为借助违规道具的间接效果，或删去施法描写。",
    ...overrides,
  };
}

function buildAuditFixture(issues) {
  const now = "2026-10-20T00:00:00.000Z";
  return buildRuntimePackage({
    novelId: "novel-1",
    chapterId: "chapter-1",
    request: { provider: null, model: null, temperature: null },
    contextPackage: { chapter: { order: 5, title: "第5章" } },
    finalContent: "正文内容。",
    auditResult: {
      score: { overall: 80 },
      auditReports: [{
        id: "report-1",
        auditType: "continuity",
        overallScore: 80,
        summary: "一致性守卫测试报告。",
        legacyScoreJson: null,
        createdAt: now,
        updatedAt: now,
        issues: issues.map((issue, index) => ({
          id: `issue-${index + 1}`,
          reportId: "report-1",
          auditType: "continuity",
          severity: issue.severity,
          code: issue.code,
          description: issue.description,
          evidence: issue.evidence,
          fixSuggestion: issue.fixSuggestion,
          status: "open",
          createdAt: now,
          updatedAt: now,
        })),
      }],
    },
    activeOpenConflicts: [],
    styleReview: { autoRewritten: false, report: null },
    acceptance: { status: "passed", repairability: "none", decisionReason: "", missingObligations: [] },
    runId: null,
    plannerService: { shouldTriggerReplanFromAudit: () => false },
  });
}

test("守卫码识别与规范化:去重、排序、限量、丢空证据、非守卫码透传", () => {
  for (const code of CONTINUITY_GUARD_CODES) {
    assert.equal(isContinuityGuardCode(code), true, `${code} 应被识别为守卫码`);
  }
  assert.equal(isContinuityGuardCode("plot_escalation_soft"), false);

  // 同码同描述去重:保留更严重版本 + 按严重度排序
  const deduped = normalizeContinuityGuardIssues([
    guardIssue({ severity: "medium" }),
    guardIssue({ severity: "critical" }),
    guardIssue({ severity: "critical" }),
  ]);
  assert.equal(deduped.length, 1, "同码同描述只保留一条");
  assert.equal(deduped[0].severity, "critical", "重复上报时保留更严重的版本");

  const distinct = normalizeContinuityGuardIssues([
    guardIssue({ severity: "medium", description: "时间线顺序问题 A。", code: "continuity_timeline_conflict" }),
    guardIssue({ severity: "critical", description: "时间线顺序问题 B。", code: "continuity_timeline_conflict" }),
  ]);
  assert.equal(distinct.length, 2, "不同描述不合并");
  assert.equal(distinct[0].severity, "critical", "高严重度排前");

  // 无证据指控丢弃(占位证据与空证据)
  const dropped = normalizeContinuityGuardIssues([
    guardIssue({ evidence: "" }),
    guardIssue({ evidence: "未提供证据", description: "另一条无证据指控。" }),
    guardIssue(),
  ]);
  assert.equal(dropped.length, 1, "空证据/占位证据的一致性指控不得进入治理链");

  // 限量 + 非守卫码透传且排在后面
  const many = [
    ...Array.from({ length: 7 }, (_, index) => guardIssue({
      description: `第 ${index} 条时间线矛盾。`,
      code: "continuity_timeline_conflict",
    })),
    { severity: "high", code: "plot_escalation_soft", description: "普通剧情问题", evidence: "e", fixSuggestion: "f" },
  ];
  const capped = normalizeContinuityGuardIssues(many);
  assert.equal(capped.length, MAX_CONTINUITY_ISSUES_PER_REPORT + 1, "守卫问题限量,非守卫问题保留");
  assert.equal(capped[capped.length - 1].code, "plot_escalation_soft", "非守卫问题排在后面");
});

test("审校 prompt v3 注册且包含一致性守卫协议与三个专用码", () => {
  const asset = getRegisteredPromptAsset("audit.chapter.full", "v3");
  assert.ok(asset, "audit.chapter.full@v3 必须已注册");
  assert.equal(asset.contextPolicy.maxTokensBudget, NOVEL_PROMPT_BUDGETS.chapterReview, "上下文预算沿用审校预算");

  const source = fs.readFileSync(
    path.join(repoRoot, "src", "prompting", "prompts", "audit", "audit.prompts.ts"),
    "utf8",
  );
  assert.match(source, /一致性守卫/, "prompt 必须包含一致性守卫协议段");
  for (const code of CONTINUITY_GUARD_CODES) {
    assert.ok(source.includes(code), `prompt 必须声明专用码 ${code}`);
  }
  assert.match(source, /evidence 必须引用被违背的具体事实/, "prompt 必须要求引用被违背的具体事实");
});

test("构造矛盾场景产出治理动作:high 进 blocking,medium 走质量债,其它 high 仍阻塞", () => {
  const highPackage = buildAuditFixture([guardIssue({ severity: "high" })]);
  assert.ok(
    highPackage.audit.openIssues.some((issue) => issue.code === "continuity_world_rule_conflict"),
    "high 一致性冲突必须进入运行时 openIssues",
  );
  assert.equal(highPackage.audit.hasBlockingIssues, true, "high 一致性冲突应触发 blocking 治理动作");
  assert.ok(
    (highPackage.replanRecommendation?.blockingIssueIds ?? []).includes("issue-1"),
    "blockingIssueIds 应包含一致性冲突问题",
  );

  const mediumPackage = buildAuditFixture([guardIssue({ severity: "medium" })]);
  assert.ok(mediumPackage.audit.openIssues.some((issue) => issue.code === "continuity_world_rule_conflict"));
  assert.equal(mediumPackage.audit.hasBlockingIssues, false, "medium 一致性冲突作为质量债,不阻塞推进");

  const otherHighPackage = buildAuditFixture([{
    severity: "high",
    code: "plot_escalation_soft",
    description: "主线冲突代价不足。",
    evidence: "威胁出现后主角立刻脱身。",
    fixSuggestion: "补一个无法立刻摆脱的代价。",
  }]);
  assert.equal(otherHighPackage.audit.hasBlockingIssues, true, "反证:其它 high 问题仍保持阻塞语义");
});
