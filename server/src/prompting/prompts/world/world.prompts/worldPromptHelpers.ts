import type { WorldReferenceMode } from "@ai-novel/shared/types/worldWizard";

// world.prompts 共享辅助:参考方式标签与宽松对象清洗(拆分自 world.prompts.ts,RF-1)。
export function buildReferenceModeLabel(mode: WorldReferenceMode | null | undefined): string {
  switch (mode) {
    case "extract_base":
      return "提取原作世界基底";
    case "tone_rebuild":
      return "借用原作气质与结构重建";
    case "adapt_world":
    default:
      return "基于原作做架空改造";
  }
}

export function sanitizeLooseWorldObject(value: unknown, allowedKeys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 必须返回 JSON 对象。`);
  }

  const record = value as Record<string, unknown>;
  const normalizedAllowedKeys = new Set(allowedKeys.map((key) => key.trim()).filter(Boolean));
  if (normalizedAllowedKeys.size === 0) {
    throw new Error(`${label} 缺少允许字段配置。`);
  }

  const filteredEntries = Object.entries(record).filter(([key, fieldValue]) => {
    if (!normalizedAllowedKeys.has(key)) {
      return false;
    }
    return fieldValue != null;
  });

  if (filteredEntries.length === 0) {
    throw new Error(`${label} 没有返回任何允许字段。`);
  }

  return Object.fromEntries(filteredEntries);
}
