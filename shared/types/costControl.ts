// INN-D1 token 预算与成本报表共享契约:按书成本报告 + 生产链 token 预算。
export interface CostUsageEventLike {
  taskType: string | null;
  provider: string | null;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
}

export interface CostRouteLike {
  taskType: string;
  provider: string;
  model: string;
}

export interface TaskCostComparisonRow {
  taskType: string;
  promptTokens: number;
  completionTokens: number;
  /** 窗口内实际发生模型的成本合计(可含多模型混用)。 */
  actualCost: number | null;
  currentRouteModel: string | null;
  currentRouteCost: number | null;
  cheapestModel: string | null;
  cheapestCost: number | null;
  premiumModel: string | null;
  premiumCost: number | null;
  /** currentRouteCost - cheapestCost;任一为 null 时为 null。 */
  savingsVsCheapest: number | null;
}

export interface CostReport {
  periodDays: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  rows: TaskCostComparisonRow[];
  totals: {
    actualCost: number | null;
    currentRouteCost: number | null;
    cheapestCost: number | null;
    premiumCost: number | null;
    savingsVsCheapest: number | null;
  };
  unpricedModels: string[];
  pricedModels: string[];
}

/** 全局默认预算 + 按书覆盖;novels 中值为正整数 token 数。 */
export interface ProductionTokenBudgetSettings {
  defaultTokens: number | null;
  novels: Record<string, number>;
}

/** 单本书当前预算与累计用量(累计口径:全部已记录的生产链调用)。 */
export interface ProductionTokenBudgetStatus {
  novelId: string;
  budgetTokens: number | null;
  usedTokens: number;
  exceeded: boolean;
}
