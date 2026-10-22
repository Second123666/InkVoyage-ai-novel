// INN-D1 成本面板展示格式:纯函数,便于单测。
const TASK_TYPE_LABELS: Record<string, string> = {
  planner: "规划",
  writer: "正文生成",
  review: "审校",
  light_review: "轻审校",
  critical_review: "严格审校",
  repair: "修复",
  replan: "重规划",
  state_resolution: "状态整理",
  summary: "摘要",
  fact_extraction: "事实提取",
  chat: "对话",
  "未分类": "未分类",
};

export function resolveTaskTypeLabel(taskType: string | null | undefined): string {
  const normalized = String(taskType ?? "").trim();
  if (!normalized) {
    return "未分类";
  }
  return TASK_TYPE_LABELS[normalized] ?? normalized;
}

export function formatTokenCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }
  return Math.max(0, Math.round(value)).toLocaleString("zh-CN");
}

export function formatCostAmount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }
  if (value === 0) {
    return "0";
  }
  if (Math.abs(value) >= 1) {
    return value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  }
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 6 });
}
