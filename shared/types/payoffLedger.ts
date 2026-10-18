export type PayoffLedgerScopeType = "book" | "volume" | "chapter";

export type PayoffLedgerStatus = "setup" | "hinted" | "pending_payoff" | "paid_off" | "failed" | "overdue";

export interface PayoffLedgerSourceRef {
  kind: "major_payoff" | "volume_open_payoff" | "chapter_payoff_ref" | "foreshadow_state" | "open_conflict" | "audit_issue" | "manual";
  refId?: string | null;
  refLabel: string;
  chapterId?: string | null;
  chapterOrder?: number | null;
  volumeId?: string | null;
  volumeSortOrder?: number | null;
}

export interface PayoffLedgerEvidence {
  summary: string;
  chapterId?: string | null;
  chapterOrder?: number | null;
}

export interface PayoffLedgerRiskSignal {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  stale?: boolean;
}

export interface PayoffLedgerItem {
  id: string;
  novelId: string;
  ledgerKey: string;
  title: string;
  summary: string;
  scopeType: PayoffLedgerScopeType;
  currentStatus: PayoffLedgerStatus;
  targetStartChapterOrder?: number | null;
  targetEndChapterOrder?: number | null;
  firstSeenChapterOrder?: number | null;
  lastTouchedChapterOrder?: number | null;
  lastTouchedChapterId?: string | null;
  setupChapterId?: string | null;
  payoffChapterId?: string | null;
  lastSnapshotId?: string | null;
  sourceRefs: PayoffLedgerSourceRef[];
  evidence: PayoffLedgerEvidence[];
  riskSignals: PayoffLedgerRiskSignal[];
  statusReason?: string | null;
  confidence?: number | null;
  /** 用户手动标记后锁定,AI 对账不再改写状态/原因/目标窗口。 */
  manualLocked?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePayoffLedgerItemPayload {
  title: string;
  summary: string;
  scopeType?: PayoffLedgerScopeType;
  targetStartChapterOrder?: number | null;
  targetEndChapterOrder?: number | null;
}

export interface UpdatePayoffLedgerItemPayload {
  /** 用户可写的状态仅限终态与恢复跟踪;setup/hinted/overdue 由 AI 流程派生。 */
  currentStatus?: Extract<PayoffLedgerStatus, "paid_off" | "failed" | "pending_payoff">;
  statusReason?: string | null;
  /** 随状态标记生效:默认 true(锁定);显式 false =「重新打开」,交还 AI 跟踪。 */
  manualLocked?: boolean;
  targetStartChapterOrder?: number | null;
  targetEndChapterOrder?: number | null;
}

export interface PayoffLedgerSummary {
  totalCount: number;
  pendingCount: number;
  urgentCount: number;
  overdueCount: number;
  paidOffCount: number;
  failedCount: number;
  updatedAt?: string | null;
}

export interface PayoffLedgerResponse {
  summary: PayoffLedgerSummary;
  items: PayoffLedgerItem[];
  updatedAt?: string | null;
}
