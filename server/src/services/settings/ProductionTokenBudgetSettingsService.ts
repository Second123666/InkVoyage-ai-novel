// INN-D1 生产链 token 预算配置(AppSetting JSON:全局默认 + 按书覆盖)。
import type { ProductionTokenBudgetSettings } from "@ai-novel/shared/types/costControl";
import { prisma } from "../../db/prisma";

export const PRODUCTION_TOKEN_BUDGET_SETTING_KEY = "llm.production_token_budget";

interface AppSettingStore {
  findUnique(args: { where: { key: string } }): Promise<{ key: string; value: string } | null>;
  upsert(args: {
    where: { key: string };
    update: { value: string };
    create: { key: string; value: string };
  }): Promise<unknown>;
}

function toBudgetTokens(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    return null;
  }
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : null;
}

export function parseProductionTokenBudgetSettings(
  raw: string | null | undefined,
): ProductionTokenBudgetSettings {
  if (!raw?.trim()) {
    return { defaultTokens: null, novels: {} };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { defaultTokens: null, novels: {} };
  }
  const container = parsed && typeof parsed === "object"
    ? (parsed as { budgets?: unknown }).budgets ?? parsed
    : null;
  if (!container || typeof container !== "object" || Array.isArray(container)) {
    return { defaultTokens: null, novels: {} };
  }
  const record = container as { defaultTokens?: unknown; novels?: unknown };
  const novels: Record<string, number> = {};
  if (record.novels && typeof record.novels === "object" && !Array.isArray(record.novels)) {
    for (const [novelId, value] of Object.entries(record.novels as Record<string, unknown>)) {
      const tokens = toBudgetTokens(value);
      if (novelId.trim() && tokens !== null) {
        novels[novelId.trim()] = tokens;
      }
    }
  }
  return {
    defaultTokens: toBudgetTokens(record.defaultTokens),
    novels,
  };
}

export function resolveProductionTokenBudget(
  settings: ProductionTokenBudgetSettings,
  novelId: string | null | undefined,
): number | null {
  const normalizedNovelId = String(novelId ?? "").trim();
  if (normalizedNovelId && settings.novels[normalizedNovelId] !== undefined) {
    return settings.novels[normalizedNovelId];
  }
  return settings.defaultTokens;
}

export class ProductionTokenBudgetSettingsService {
  constructor(private readonly deps: { appSettingStore?: AppSettingStore } = {}) {}

  private getStore(): AppSettingStore {
    return this.deps.appSettingStore ?? (prisma.appSetting as unknown as AppSettingStore);
  }

  async getSettings(): Promise<ProductionTokenBudgetSettings> {
    try {
      const record = await this.getStore().findUnique({
        where: { key: PRODUCTION_TOKEN_BUDGET_SETTING_KEY },
      });
      return parseProductionTokenBudgetSettings(record?.value);
    } catch {
      return { defaultTokens: null, novels: {} };
    }
  }

  async saveSettings(input: unknown): Promise<ProductionTokenBudgetSettings> {
    const settings = parseProductionTokenBudgetSettings(JSON.stringify(input ?? {}));
    await this.persist(settings);
    return settings;
  }

  async getBudgetForNovel(novelId: string): Promise<number | null> {
    const settings = await this.getSettings();
    return resolveProductionTokenBudget(settings, novelId);
  }

  async saveNovelBudget(
    novelId: string,
    budgetTokens: number | null,
  ): Promise<ProductionTokenBudgetSettings> {
    const normalizedNovelId = novelId.trim();
    if (!normalizedNovelId) {
      throw new Error("缺少小说 ID，无法保存预算。");
    }
    const settings = await this.getSettings();
    const novels = { ...settings.novels };
    if (budgetTokens === null) {
      delete novels[normalizedNovelId];
    } else {
      const tokens = toBudgetTokens(budgetTokens);
      if (tokens === null) {
        throw new Error("预算必须是大于 0 的 token 数。");
      }
      novels[normalizedNovelId] = tokens;
    }
    const next: ProductionTokenBudgetSettings = {
      defaultTokens: settings.defaultTokens,
      novels,
    };
    await this.persist(next);
    return next;
  }

  private async persist(settings: ProductionTokenBudgetSettings): Promise<void> {
    await this.getStore().upsert({
      where: { key: PRODUCTION_TOKEN_BUDGET_SETTING_KEY },
      update: { value: JSON.stringify(settings) },
      create: { key: PRODUCTION_TOKEN_BUDGET_SETTING_KEY, value: JSON.stringify(settings) },
    });
  }
}

export const productionTokenBudgetSettingsService = new ProductionTokenBudgetSettingsService();
