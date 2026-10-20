// INN-B3 成本感知路由:按书的调用流水聚合 + 当前路由 vs 经济/强模型路由成本对比。
// 纯计算与 IO 分离:buildCostReport 可单测,服务方法负责取数。
import { prisma } from "../../db/prisma";
import {
  modelPricingSettingsService,
  resolveModelPriceKey,
  type ModelPriceMap,
} from "../settings/ModelPricingSettingsService";

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

const UNCLASSIFIED_TASK = "未分类";

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function estimateCost(input: {
  promptTokens: number;
  completionTokens: number;
}, price: { inputPer1M: number; outputPer1M: number } | null | undefined): number | null {
  if (!price) {
    return null;
  }
  return roundCost(
    (Math.max(0, input.promptTokens) * price.inputPer1M
      + Math.max(0, input.completionTokens) * price.outputPer1M) / 1_000_000,
  );
}

function aggregateByTask(events: CostUsageEventLike[]): Map<string, {
  promptTokens: number;
  completionTokens: number;
  byModel: Array<{ modelKey: string | null; promptTokens: number; completionTokens: number }>;
}> {
  const grouped = new Map<string, {
    promptTokens: number;
    completionTokens: number;
    byModel: Map<string | null, { promptTokens: number; completionTokens: number }>;
  }>();
  for (const event of events) {
    const taskType = (event.taskType ?? "").trim() || UNCLASSIFIED_TASK;
    const bucket = grouped.get(taskType) ?? {
      promptTokens: 0,
      completionTokens: 0,
      byModel: new Map<string | null, { promptTokens: number; completionTokens: number }>(),
    };
    const promptTokens = Math.max(0, event.promptTokens ?? 0);
    const completionTokens = Math.max(0, event.completionTokens ?? 0);
    bucket.promptTokens += promptTokens;
    bucket.completionTokens += completionTokens;
    const modelKey = resolveModelPriceKey(event.provider, event.model);
    const modelBucket = bucket.byModel.get(modelKey) ?? { promptTokens: 0, completionTokens: 0 };
    modelBucket.promptTokens += promptTokens;
    modelBucket.completionTokens += completionTokens;
    bucket.byModel.set(modelKey, modelBucket);
    grouped.set(taskType, bucket);
  }
  const result = new Map<string, {
    promptTokens: number;
    completionTokens: number;
    byModel: Array<{ modelKey: string | null; promptTokens: number; completionTokens: number }>;
  }>();
  for (const [taskType, bucket] of grouped) {
    result.set(taskType, {
      promptTokens: bucket.promptTokens,
      completionTokens: bucket.completionTokens,
      byModel: Array.from(bucket.byModel.entries()).map(([modelKey, usage]) => ({ modelKey, ...usage })),
    });
  }
  return result;
}

export function buildCostReport(input: {
  events: CostUsageEventLike[];
  routes: CostRouteLike[];
  prices: ModelPriceMap;
  periodDays: number;
}): CostReport {
  const pricedEntries = Object.entries(input.prices);
  const cheapestEntry = pricedEntries.length > 0
    ? pricedEntries.reduce((left, right) => {
      const leftCost = left[1].inputPer1M + left[1].outputPer1M;
      const rightCost = right[1].inputPer1M + right[1].outputPer1M;
      return rightCost < leftCost ? right : left;
    })
    : null;
  const premiumEntry = pricedEntries.length > 0
    ? pricedEntries.reduce((left, right) => {
      const leftCost = left[1].inputPer1M + left[1].outputPer1M;
      const rightCost = right[1].inputPer1M + right[1].outputPer1M;
      return rightCost > leftCost ? right : left;
    })
    : null;
  const routeByTask = new Map(input.routes.map((route) => [route.taskType, route]));
  const aggregates = aggregateByTask(input.events);
  const unpriced = new Set<string>();

  const rows: TaskCostComparisonRow[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  for (const [taskType, bucket] of Array.from(aggregates.entries()).sort(([left], [right]) => left.localeCompare(right, "zh-Hans-CN"))) {
    totalPromptTokens += bucket.promptTokens;
    totalCompletionTokens += bucket.completionTokens;
    let actualCost: number | null = 0;
    for (const modelUsage of bucket.byModel) {
      if (!modelUsage.modelKey) {
        actualCost = null;
        continue;
      }
      const price = input.prices[modelUsage.modelKey];
      if (!price) {
        unpriced.add(modelUsage.modelKey);
        actualCost = null;
        continue;
      }
      const modelCost = estimateCost(modelUsage, price);
      if (actualCost !== null) {
        actualCost = roundCost(actualCost + (modelCost ?? 0));
      }
    }
    const route = routeByTask.get(taskType) ?? null;
    const routeKey = route ? resolveModelPriceKey(route.provider, route.model) : null;
    const currentRouteCost = routeKey && input.prices[routeKey]
      ? estimateCost(bucket, input.prices[routeKey])
      : null;
    const cheapestCost = cheapestEntry ? estimateCost(bucket, cheapestEntry[1]) : null;
    const premiumCost = premiumEntry ? estimateCost(bucket, premiumEntry[1]) : null;
    rows.push({
      taskType,
      promptTokens: bucket.promptTokens,
      completionTokens: bucket.completionTokens,
      actualCost,
      currentRouteModel: routeKey,
      currentRouteCost,
      cheapestModel: cheapestEntry ? cheapestEntry[0] : null,
      cheapestCost,
      premiumModel: premiumEntry ? premiumEntry[0] : null,
      premiumCost,
      savingsVsCheapest: currentRouteCost !== null && cheapestCost !== null
        ? roundCost(currentRouteCost - cheapestCost)
        : null,
    });
  }

  const sumOrNull = (pick: (row: TaskCostComparisonRow) => number | null): number | null => {
    if (rows.length === 0) {
      return null;
    }
    let total = 0;
    for (const row of rows) {
      const value = pick(row);
      if (value === null) {
        return null;
      }
      total += value;
    }
    return roundCost(total);
  };

  return {
    periodDays: input.periodDays,
    totalPromptTokens,
    totalCompletionTokens,
    rows,
    totals: {
      actualCost: sumOrNull((row) => row.actualCost),
      currentRouteCost: sumOrNull((row) => row.currentRouteCost),
      cheapestCost: sumOrNull((row) => row.cheapestCost),
      premiumCost: sumOrNull((row) => row.premiumCost),
      savingsVsCheapest: sumOrNull((row) => row.savingsVsCheapest),
    },
    unpricedModels: Array.from(unpriced).sort(),
    pricedModels: pricedEntries.map(([key]) => key).sort(),
  };
}

export const modelCostReportService = {
  async buildReport(novelId: string, periodDays = 30): Promise<CostReport> {
    const safeDays = Number.isFinite(periodDays) ? Math.min(Math.max(Math.round(periodDays), 1), 365) : 30;
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
    const [events, routes, prices] = await Promise.all([
      prisma.llmUsageEvent.findMany({
        where: { novelId, createdAt: { gte: cutoff } },
        select: {
          taskType: true,
          provider: true,
          model: true,
          promptTokens: true,
          completionTokens: true,
        },
      }).catch(() => []),
      prisma.modelRouteConfig.findMany({
        select: { taskType: true, provider: true, model: true },
      }).catch(() => []),
      modelPricingSettingsService.getPrices(),
    ]);
    return buildCostReport({ events, routes, prices, periodDays: safeDays });
  },
};
