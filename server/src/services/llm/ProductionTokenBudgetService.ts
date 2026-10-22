// INN-D1 生产链 token 预算守卫:累计用量取自按书调用流水(LlmUsageEvent),预算取自设置服务。
import type { ProductionTokenBudgetStatus } from "@ai-novel/shared/types/costControl";
import { prisma } from "../../db/prisma";
import {
  productionTokenBudgetSettingsService,
  type ProductionTokenBudgetSettingsService,
} from "../settings/ProductionTokenBudgetSettingsService";

interface UsageAggregateStore {
  aggregate(args: {
    where: { novelId: string };
    _sum: { totalTokens: true };
  }): Promise<{ _sum: { totalTokens: number | null } | null }>;
}

export function evaluateProductionTokenBudget(input: {
  budgetTokens: number | null | undefined;
  usedTokens: number | null | undefined;
}): Pick<ProductionTokenBudgetStatus, "budgetTokens" | "usedTokens" | "exceeded"> {
  const usedTokens = Number.isFinite(input.usedTokens)
    ? Math.max(0, Math.round(Number(input.usedTokens)))
    : 0;
  const budgetTokens = typeof input.budgetTokens === "number"
    && Number.isFinite(input.budgetTokens)
    && input.budgetTokens > 0
    ? Math.floor(input.budgetTokens)
    : null;
  return {
    budgetTokens,
    usedTokens,
    exceeded: budgetTokens !== null && usedTokens > budgetTokens,
  };
}

export class ProductionTokenBudgetService {
  constructor(private readonly deps: {
    settingsService?: Pick<ProductionTokenBudgetSettingsService, "getBudgetForNovel">;
    usageStore?: UsageAggregateStore;
  } = {}) {}

  private getSettingsService(): Pick<ProductionTokenBudgetSettingsService, "getBudgetForNovel"> {
    return this.deps.settingsService ?? productionTokenBudgetSettingsService;
  }

  private getUsageStore(): UsageAggregateStore {
    return this.deps.usageStore ?? (prisma.llmUsageEvent as unknown as UsageAggregateStore);
  }

  async getUsedTokens(novelId: string): Promise<number> {
    try {
      const aggregate = await this.getUsageStore().aggregate({
        where: { novelId },
        _sum: { totalTokens: true },
      });
      const total = aggregate?._sum?.totalTokens;
      return typeof total === "number" && Number.isFinite(total) ? Math.max(0, Math.round(total)) : 0;
    } catch {
      return 0;
    }
  }

  async getStatus(novelId: string): Promise<ProductionTokenBudgetStatus> {
    const [budgetTokens, usedTokens] = await Promise.all([
      this.getSettingsService().getBudgetForNovel(novelId).catch(() => null),
      this.getUsedTokens(novelId),
    ]);
    return {
      novelId,
      ...evaluateProductionTokenBudget({ budgetTokens, usedTokens }),
    };
  }
}

export const productionTokenBudgetService = new ProductionTokenBudgetService();
