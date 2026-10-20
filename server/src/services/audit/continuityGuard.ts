// INN-A2 全书一致性守卫的确定性后处理层。
// 审校 LLM 负责"判断是否矛盾"(结构化输出),本模块只做已结构化输出的规范化:
// 去重、按严重度排序、单报告限量、丢弃无证据指控 —— 不引入任何关键字式语义判定。
// 规范化后的问題沿用既有治理链(openConflicts / 运行时 openIssues / blocking / 修复与重规划)。

export const CONTINUITY_GUARD_CODES = [
  "continuity_timeline_conflict",
  "continuity_motivation_conflict",
  "continuity_world_rule_conflict",
] as const;

export type ContinuityGuardCode = (typeof CONTINUITY_GUARD_CODES)[number];

export const MAX_CONTINUITY_ISSUES_PER_REPORT = 5;

const CONTINUITY_GUARD_CODE_SET = new Set<string>(CONTINUITY_GUARD_CODES);

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const EMPTY_EVIDENCE_PLACEHOLDERS = new Set(["未提供证据", "无", "none", "n/a"]);

export interface ContinuityGuardIssueLike {
  severity: string;
  code: string;
  description: string;
  evidence: string;
  fixSuggestion: string;
}

export function isContinuityGuardCode(code: string | null | undefined): code is ContinuityGuardCode {
  return Boolean(code && CONTINUITY_GUARD_CODE_SET.has(code.trim()));
}

/**
 * 守卫码问題规范化;非守卫码问題原样保留并排在后面,保持审计报告既有语义不变。
 */
export function normalizeContinuityGuardIssues<T extends ContinuityGuardIssueLike>(issues: T[]): T[] {
  const guardIssues: T[] = [];
  const otherIssues: T[] = [];
  const indexByKey = new Map<string, number>();

  for (const issue of issues) {
    if (!isContinuityGuardCode(issue.code)) {
      otherIssues.push(issue);
      continue;
    }
    const evidence = issue.evidence?.trim() ?? "";
    if (!evidence || EMPTY_EVIDENCE_PLACEHOLDERS.has(evidence)) {
      // 无证据的一致性指控不得进入治理链,避免模型空泛断言制造噪声阻塞。
      continue;
    }
    const key = `${issue.code.trim()}:${issue.description.trim().toLowerCase()}`;
    const normalized: T = { ...issue, code: issue.code.trim() };
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      // 同一冲突被重复报告时保留更严重的版本,避免低严重度副本盖掉高危结论。
      const existing = guardIssues[existingIndex];
      if ((SEVERITY_ORDER[normalized.severity] ?? 9) < (SEVERITY_ORDER[existing.severity] ?? 9)) {
        guardIssues[existingIndex] = normalized;
      }
      continue;
    }
    indexByKey.set(key, guardIssues.length);
    guardIssues.push(normalized);
  }

  guardIssues.sort(
    (left, right) => (SEVERITY_ORDER[left.severity] ?? 9) - (SEVERITY_ORDER[right.severity] ?? 9),
  );

  return [...guardIssues.slice(0, MAX_CONTINUITY_ISSUES_PER_REPORT), ...otherIssues];
}
