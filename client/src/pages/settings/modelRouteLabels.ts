import type { ModelRouteTaskType } from "@ai-novel/shared/types/novel";

export const MODEL_ROUTE_LABELS: Record<ModelRouteTaskType, { title: string; description: string }> = {
  planner: {
    title: "大纲策划",
    description: "先理解创作目标，再安排这一段创作该怎样推进。",
  },
  writer: {
    title: "主笔写作",
    description: "生成章节正文，把章节内容完整写出来。",
  },
  review: {
    title: "通用审校",
    description: "检查剧情、节奏和文风，找出草稿里的质量问题。",
  },
  light_review: {
    title: "基础快审",
    description: "快速判断章节是否能继续推进，用于正文后的轻量质量检查。",
  },
  critical_review: {
    title: "严格审校",
    description: "处理会影响整本连续性的质量检查，适合高风险审校和复检。",
  },
  repair: {
    title: "章节修复",
    description: "根据审校问题修正文稿，让章节回到可继续推进的状态。",
  },
  replan: {
    title: "窗口重规划",
    description: "当局部修复不能收敛时，重新安排受影响章节的目标和衔接。",
  },
  state_resolution: {
    title: "状态解析",
    description: "判断章节状态提案是否可信，帮助自动导演减少人工确认。",
  },
  summary: {
    title: "剧情摘要",
    description: "把长章节整理成回顾、摘要和关键变化。",
  },
  fact_extraction: {
    title: "设定考据",
    description: "整理设定、时间线和关键事实，减少前后矛盾。",
  },
  chat: {
    title: "灵感陪写",
    description: "处理日常对话，并把结果整理成创作时能直接理解的内容。",
  },
};

// UI-1 第三批 D · 模型路由分组(LOOP-35)
// 按 rollout 计划「开书、规划、正文、审核、资料处理」组织,灵感陪写单列以免语义错位。
export const MODEL_ROUTE_GROUP_ORDER = [
  "开书设定",
  "规划推进",
  "正文生产",
  "审校把关",
  "资料加工",
  "灵感对话",
] as const;

export type ModelRouteGroup = (typeof MODEL_ROUTE_GROUP_ORDER)[number];

const MODEL_ROUTE_TASK_GROUPS: Record<ModelRouteTaskType, ModelRouteGroup> = {
  state_resolution: "开书设定",
  planner: "规划推进",
  replan: "规划推进",
  writer: "正文生产",
  repair: "正文生产",
  review: "审校把关",
  light_review: "审校把关",
  critical_review: "审校把关",
  summary: "资料加工",
  fact_extraction: "资料加工",
  chat: "灵感对话",
};

const GROUP_FALLBACK: ModelRouteGroup = "规划推进";

export function resolveModelRouteGroup(taskType: string): ModelRouteGroup {
  return MODEL_ROUTE_TASK_GROUPS[taskType as ModelRouteTaskType] ?? GROUP_FALLBACK;
}
