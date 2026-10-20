// INN-B4 失败模式 → 恢复动作知识库。
// 只做"已结构化失败信号 → 恢复指引"的确定性映射;不做自由文本关键词判断,
// 不执行任何恢复动作(可执行入口仍在源页面/导演跟进)。
import type {
  RecoveryPlaybookCatalog,
  RecoveryPlaybookEntry,
} from "@ai-novel/shared/types/recoveryPlaybook";

const ENTRIES: RecoveryPlaybookEntry[] = [
  {
    code: "manual_recovery_required",
    label: "等待人工恢复",
    explanation: "任务暂停并等待人工确认,后台轮询与自动恢复不会继续推进。",
    recommendedActions: ["回到源页面查看暂停原因", "确认后从最近进度继续执行"],
    mode: "user_action",
    retryable: false,
  },
  {
    code: "PIPELINE_FAILED",
    label: "章节流水线失败",
    explanation: "章节生成链在最近一次执行中失败,通常与模型调用、上下文或正文质量有关。",
    recommendedActions: ["打开章节页查看失败章节与错误详情", "修复后从失败章节重试"],
    mode: "user_action",
    retryable: true,
  },
  {
    code: "PIPELINE_CANCELLED",
    label: "章节流水线已取消",
    explanation: "任务被手动取消,没有继续执行。",
    recommendedActions: ["如仍需继续,从章节页重新发起执行"],
    mode: "inspect",
    retryable: true,
  },
  {
    code: "PIPELINE_EXECUTION_LEASE_LOST",
    label: "执行权丢失",
    explanation: "执行租约过期或被其他执行器接管,任务会被调度器重新领取。",
    recommendedActions: ["等待调度器重新领取", "长时间未恢复时查看运行记录"],
    mode: "auto_retry",
    retryable: true,
  },
  {
    code: "PIPELINE_QUALITY_REVIEW",
    label: "章节质量提醒",
    explanation: "章节可继续推进,但存在需要跟进的写作质量问题。",
    recommendedActions: ["在章节页查看质量提醒", "按需做局部修复或记录为质量债"],
    mode: "inspect",
    retryable: false,
  },
  {
    code: "PIPELINE_REPLAN_REQUIRED",
    label: "需要重规划",
    explanation: "后续章节安排与当前状态失配,继续前需要先调整附近章节计划。",
    recommendedActions: ["打开重规划入口查看建议范围", "确认后再继续生成"],
    mode: "replan",
    retryable: false,
  },
  {
    code: "CHAPTER_TITLE_DIVERSITY",
    label: "章节标题相似度提醒",
    explanation: "近期章节标题重复度偏高,属于质量提醒而非失败。",
    recommendedActions: ["在章节页使用 AI 修复标题", "或手动调整后再继续"],
    mode: "inspect",
    retryable: false,
  },
  {
    code: "CHAPTER_EMPTY_CONTENT",
    label: "章节内容为空",
    explanation: "章节没有可用正文,无法完成审核与后续状态同步。",
    recommendedActions: ["重新生成该章正文", "或在编辑器中手动补写后重新审核"],
    mode: "user_action",
    retryable: true,
  },
  {
    code: "NOVEL_WORKFLOW_FAILED",
    label: "自动导演任务失败",
    explanation: "导演流程在最近一步失败;已生成的正文与资产会保留。",
    recommendedActions: ["查看导演跟进中的失败原因", "从最近进度恢复或按提示修复后重试"],
    mode: "user_action",
    retryable: true,
  },
  {
    code: "STYLE_EXTRACTION_FAILED",
    label: "写法提取失败",
    explanation: "从文本或知识库提取写法特征时失败。",
    recommendedActions: ["检查原文样本与模型配置", "重新发起提取"],
    mode: "user_action",
    retryable: true,
  },
  {
    code: "STYLE_EXTRACTION_TASK_CANCELLED",
    label: "写法提取已取消",
    explanation: "写法提取任务被手动取消。",
    recommendedActions: ["如仍需该写法,重新发起提取"],
    mode: "inspect",
    retryable: true,
  },
  {
    code: "IMAGE_GENERATION_FAILED",
    label: "图像生成失败",
    explanation: "图像任务失败,常见原因是图片模型未配置或额度不足。",
    recommendedActions: ["确认图片模型与额度", "在源页面重新生成"],
    mode: "user_action",
    retryable: true,
  },
  {
    code: "IMAGE_TASK_CANCELLED",
    label: "图像任务已取消",
    explanation: "图像任务被手动取消。",
    recommendedActions: ["如需继续,在源页面重新生成"],
    mode: "inspect",
    retryable: true,
  },
  {
    code: "BOOK_ANALYSIS_FAILED",
    label: "拆书分析失败",
    explanation: "拆书任务在分析阶段失败,已产出的部分结果通常会保留。",
    recommendedActions: ["在拆书页查看失败阶段", "补齐原文或换模型后重试"],
    mode: "user_action",
    retryable: true,
  },
  {
    code: "BOOK_ANALYSIS_CANCELLED",
    label: "拆书任务已取消",
    explanation: "拆书任务被手动取消。",
    recommendedActions: ["如仍需分析结果,重新发起拆书"],
    mode: "inspect",
    retryable: true,
  },
  {
    code: "draft_generation_failed",
    label: "正文生成失败",
    explanation: "章节草稿未能生成,通常是模型调用或上下文问题。",
    recommendedActions: ["检查模型连通性与上下文长度", "从章节页重试生成"],
    mode: "user_action",
    retryable: true,
  },
  {
    code: "draft_obligation_unmet",
    label: "章节义务未完全满足",
    explanation: "正文可用,但部分章节义务没有落实,记录为质量债继续推进。",
    recommendedActions: ["查看未满足义务清单", "在后续章节回收或做局部修复"],
    mode: "inspect",
    retryable: false,
  },
  {
    code: "draft_repair_exhausted",
    label: "修复尝试已用尽",
    explanation: "自动修复未能解决阻塞问题,章节已停在可查看状态。",
    recommendedActions: ["查看残余审核问题", "手动调整后继续,或调整问题处理策略"],
    mode: "user_action",
    retryable: false,
  },
  {
    code: "replan_required",
    label: "需要重规划",
    explanation: "章节目标与计划窗口失配,继续前需要调整附近章节职责。",
    recommendedActions: ["进入重规划查看建议", "确认新计划后继续"],
    mode: "replan",
    retryable: false,
  },
  {
    code: "unknown_failure",
    label: "未分类失败",
    explanation: "系统没有为该失败码登记专门的恢复建议。",
    recommendedActions: ["查看运行记录中的错误详情", "如重复出现,请补充失败原因以便登记指引"],
    mode: "inspect",
    retryable: true,
  },
];

const ENTRY_BY_CODE = new Map(ENTRIES.map((entry) => [entry.code.toLowerCase(), entry]));
const FALLBACK_ENTRY = ENTRY_BY_CODE.get("unknown_failure") as RecoveryPlaybookEntry;
const MANUAL_RECOVERY_ENTRY = ENTRY_BY_CODE.get("manual_recovery_required") as RecoveryPlaybookEntry;

export function listRecoveryPlaybook(): RecoveryPlaybookCatalog {
  return { entries: ENTRIES };
}

export function resolveRecoveryGuidance(input: {
  failureCode?: string | null;
  noticeCode?: string | null;
  failureClassificationCode?: string | null;
  pendingManualRecovery?: boolean | null;
}): RecoveryPlaybookEntry | null {
  if (input.pendingManualRecovery === true) {
    return MANUAL_RECOVERY_ENTRY;
  }
  for (const code of [input.failureCode, input.noticeCode, input.failureClassificationCode]) {
    const normalized = code?.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    const entry = ENTRY_BY_CODE.get(normalized);
    if (entry) {
      return entry;
    }
  }
  const hasAnyCode = Boolean(
    input.failureCode?.trim() || input.noticeCode?.trim() || input.failureClassificationCode?.trim(),
  );
  return hasAnyCode ? FALLBACK_ENTRY : null;
}
