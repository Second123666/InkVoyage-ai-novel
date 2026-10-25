// UI-1 第五批 · 预览页阅读进度与推荐动作(LOOP-40)
// 纯函数:根据当前章序与总章数推导阅读进度与编辑器推荐标签,便于单测。

export interface ReadingProgress {
  currentOrder: number;
  totalChapters: number;
  /** 0-100,无章节或无当前章时为 0。 */
  percent: number;
  progressLabel: string;
  percentLabel: string;
}

export function buildReadingProgress(input: {
  activeOrder: number | null | undefined;
  totalChapters: number;
}): ReadingProgress {
  const totalChapters = Math.max(0, Math.floor(input.totalChapters));
  const currentOrder = typeof input.activeOrder === "number" && Number.isFinite(input.activeOrder) && input.activeOrder > 0
    ? Math.floor(input.activeOrder)
    : 0;
  const percent = totalChapters > 0 && currentOrder > 0
    ? Math.min(100, Math.round((currentOrder / totalChapters) * 100))
    : 0;
  return {
    currentOrder,
    totalChapters,
    percent,
    progressLabel: totalChapters > 0 && currentOrder > 0
      ? `第 ${currentOrder} 章 / 共 ${totalChapters} 章`
      : totalChapters > 0
        ? `共 ${totalChapters} 章`
        : "暂无可读章节",
    percentLabel: `${percent}%`,
  };
}

/** 进入编辑器的推荐动作:优先引导编辑当前章节,否则进入工作区。路由由调用方按 novelId 拼接。 */
export type PreviewEditRecommendation =
  | { kind: "chapter"; chapterId: string; label: string }
  | { kind: "workspace"; label: string };

export function buildPreviewEditRecommendation(input: {
  activeChapterId: string | null | undefined;
  activeOrder: number | null | undefined;
}): PreviewEditRecommendation {
  if (input.activeChapterId) {
    const order = typeof input.activeOrder === "number" && input.activeOrder > 0 ? input.activeOrder : null;
    return {
      kind: "chapter",
      chapterId: input.activeChapterId,
      label: order !== null ? `继续编辑第 ${order} 章` : "编辑当前章节",
    };
  }
  return { kind: "workspace", label: "进入工作区" };
}

/** 推荐动作的目标路由。 */
export function resolveRecommendationRoute(
  novelId: string,
  recommendation: PreviewEditRecommendation,
): string {
  return recommendation.kind === "chapter"
    ? `/novels/${novelId}/chapters/${recommendation.chapterId}`
    : `/novels/${novelId}/edit`;
}
