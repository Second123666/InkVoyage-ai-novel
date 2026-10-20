// INN-B3 成本感知路由:模型价格配置(AppSetting JSON,按 provider::model 唯一键)。
import { prisma } from "../../db/prisma";

export const MODEL_PRICES_SETTING_KEY = "llm.model_prices";

export interface ModelPriceEntry {
  provider: string;
  model: string;
  inputPer1M: number;
  outputPer1M: number;
}

export type ModelPriceMap = Record<string, { inputPer1M: number; outputPer1M: number }>;

interface AppSettingStore {
  findUnique(args: { where: { key: string } }): Promise<{ key: string; value: string } | null>;
  upsert(args: {
    where: { key: string };
    update: { value: string };
    create: { key: string; value: string };
  }): Promise<unknown>;
}

export function resolveModelPriceKey(
  provider: string | null | undefined,
  model: string | null | undefined,
): string | null {
  const normalizedProvider = String(provider ?? "").trim().toLowerCase();
  const normalizedModel = String(model ?? "").trim();
  return normalizedProvider && normalizedModel ? `${normalizedProvider}::${normalizedModel}` : null;
}

function toNonNegativeNumber(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseModelPrices(raw: string | null | undefined): ModelPriceMap {
  if (!raw?.trim()) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  const container = parsed && typeof parsed === "object"
    ? (parsed as { prices?: unknown }).prices ?? parsed
    : null;
  if (!container || typeof container !== "object" || Array.isArray(container)) {
    return {};
  }
  const result: ModelPriceMap = {};
  for (const [key, value] of Object.entries(container as Record<string, unknown>)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const input = toNonNegativeNumber((value as { inputPer1M?: unknown }).inputPer1M);
    const output = toNonNegativeNumber((value as { outputPer1M?: unknown }).outputPer1M);
    if (input === null || output === null || !key.trim()) {
      continue;
    }
    result[key.trim()] = { inputPer1M: input, outputPer1M: output };
  }
  return result;
}

export class ModelPricingSettingsService {
  constructor(private readonly deps: { appSettingStore?: AppSettingStore } = {}) {}

  private getStore(): AppSettingStore {
    return this.deps.appSettingStore ?? (prisma.appSetting as unknown as AppSettingStore);
  }

  async getPrices(): Promise<ModelPriceMap> {
    try {
      const record = await this.getStore().findUnique({ where: { key: MODEL_PRICES_SETTING_KEY } });
      return parseModelPrices(record?.value);
    } catch {
      return {};
    }
  }

  async savePrices(input: { prices: ModelPriceEntry[] }): Promise<ModelPriceMap> {
    const next: ModelPriceMap = {};
    for (const entry of input.prices ?? []) {
      const key = resolveModelPriceKey(entry.provider, entry.model);
      const inputPer1M = toNonNegativeNumber(entry.inputPer1M);
      const outputPer1M = toNonNegativeNumber(entry.outputPer1M);
      if (!key || inputPer1M === null || outputPer1M === null) {
        continue;
      }
      next[key] = { inputPer1M, outputPer1M };
    }
    await this.getStore().upsert({
      where: { key: MODEL_PRICES_SETTING_KEY },
      update: { value: JSON.stringify({ prices: next }) },
      create: { key: MODEL_PRICES_SETTING_KEY, value: JSON.stringify({ prices: next }) },
    });
    return next;
  }
}

export const modelPricingSettingsService = new ModelPricingSettingsService();
