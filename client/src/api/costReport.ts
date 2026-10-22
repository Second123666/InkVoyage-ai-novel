import type { ApiResponse } from "@ai-novel/shared/types/api";
import type {
  CostReport,
  ProductionTokenBudgetStatus,
} from "@ai-novel/shared/types/costControl";
import { apiClient } from "./client";

// INN-D1 按书成本报表与 token 预算。
export async function getNovelCostReport(novelId: string, days = 30) {
  const { data } = await apiClient.get<ApiResponse<CostReport>>(`/cost-report/${novelId}`, {
    params: { days },
  });
  return data;
}

export async function getProductionTokenBudget(novelId: string) {
  const { data } = await apiClient.get<ApiResponse<ProductionTokenBudgetStatus>>(
    `/production-budget/${novelId}`,
  );
  return data;
}

export async function saveProductionTokenBudget(novelId: string, budgetTokens: number | null) {
  const { data } = await apiClient.put<ApiResponse<ProductionTokenBudgetStatus>>(
    `/production-budget/${novelId}`,
    { budgetTokens },
  );
  return data;
}
