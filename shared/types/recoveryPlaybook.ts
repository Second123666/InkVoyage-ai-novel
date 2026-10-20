// INN-B4 失败模式 → 恢复动作知识库:结构化失败信号到恢复指引的确定性映射。
export type RecoveryPlaybookMode = "auto_retry" | "user_action" | "replan" | "inspect";

export interface RecoveryPlaybookEntry {
  /** 结构化失败/提醒/分类码(大写枚举与 failureClassification 码共用本字段)。 */
  code: string;
  label: string;
  explanation: string;
  /** 用户视角的恢复动作建议(文字;可执行入口仍在源页面/导演跟进)。 */
  recommendedActions: string[];
  mode: RecoveryPlaybookMode;
  retryable: boolean;
}

export interface RecoveryPlaybookCatalog {
  entries: RecoveryPlaybookEntry[];
}
