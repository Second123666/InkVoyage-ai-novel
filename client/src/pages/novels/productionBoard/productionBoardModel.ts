import type { ChapterQualityDebtDetails } from "@ai-novel/shared/types/chapterQualityLoop";
import type { SimpleCreationShelfChapterStatus } from "@ai-novel/shared/types/novel";

// INN-C2 生产看板:纯前端聚合模型(复用小说详情数据,不新增后端契约)。
export interface ProductionBoardChapterInput {
  id: string;
  order: number;
  title: string;
  status: SimpleCreationShelfChapterStatus;
  wordCount: number;
  qualityDebt: ChapterQualityDebtDetails | null;
}

export interface ProductionBoardVolumeInput {
  id: string;
  sortOrder: number;
  title: string;
  chapters: Array<{ chapterOrder: number }>;
}

export const CHAPTER_STATUS_META: Record<
  SimpleCreationShelfChapterStatus,
  { label: string; tone: "muted" | "info" | "warning" | "success" | "destructive" }
> = {
  waiting_planning: { label: "待规划", tone: "muted" },
  waiting_writing: { label: "待写作", tone: "muted" },
  generating: { label: "生成中", tone: "info" },
  reviewing: { label: "审核中", tone: "info" },
  quality_debt: { label: "质量修复", tone: "warning" },
  replan_required: { label: "待重规划", tone: "warning" },
  completed: { label: "已完成", tone: "success" },
  error: { label: "生成失败", tone: "destructive" },
};

const STATUS_ORDER = Object.keys(CHAPTER_STATUS_META) as SimpleCreationShelfChapterStatus[];
const ATTENTION_STATUSES: SimpleCreationShelfChapterStatus[] = ["error", "replan_required", "quality_debt"];
const ATTENTION_PRIORITY: Record<string, number> = { error: 0, replan_required: 1, quality_debt: 2 };

export interface ProductionBoardModel {
  totalChapters: number;
  totalWordCount: number;
  completionRatio: number;
  statusCounts: Array<{ status: SimpleCreationShelfChapterStatus; label: string; count: number }>;
  attentionChapters: Array<{ id: string; order: number; title: string; status: SimpleCreationShelfChapterStatus; label: string }>;
  debtHotspots: Array<{
    chapterId: string;
    order: number;
    title: string;
    issueCodes: string[];
    reason: string;
    repairAttemptsUsed: number | null;
  }>;
  volumeProgress: Array<{
    volumeId: string;
    title: string;
    totalChapters: number;
    completedChapters: number;
    attentionChapters: number;
    ratio: number;
  }>;
  unassignedChapterCount: number;
  // UI-7 统计图表数据:卷字数与质量债务问题码分布(供 Recharts 面板使用)。
  wordCountByVolume: Array<{ name: string; wordCount: number }>;
  debtIssueCounts: Array<{ code: string; count: number }>;
}

export function buildProductionBoardModel(input: {
  chapters: ProductionBoardChapterInput[];
  volumes: ProductionBoardVolumeInput[];
}): ProductionBoardModel {
  const chapters = [...input.chapters].sort((left, right) => left.order - right.order);
  const totalChapters = chapters.length;
  const totalWordCount = chapters.reduce((sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0), 0);
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    label: CHAPTER_STATUS_META[status].label,
    count: chapters.filter((chapter) => chapter.status === status).length,
  }));
  const completedCount = chapters.filter((chapter) => chapter.status === "completed").length;

  const attentionChapters = chapters
    .filter((chapter) => ATTENTION_STATUSES.includes(chapter.status))
    .sort((left, right) => (
      (ATTENTION_PRIORITY[left.status] ?? 9) - (ATTENTION_PRIORITY[right.status] ?? 9)
      || left.order - right.order
    ))
    .map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      status: chapter.status,
      label: CHAPTER_STATUS_META[chapter.status].label,
    }));

  const debtHotspots = chapters
    .filter((chapter) => Boolean(chapter.qualityDebt))
    .sort((left, right) => (
      (right.qualityDebt?.issueCodes.length ?? 0) - (left.qualityDebt?.issueCodes.length ?? 0)
      || left.order - right.order
    ))
    .slice(0, 5)
    .map((chapter) => ({
      chapterId: chapter.id,
      order: chapter.order,
      title: chapter.title,
      issueCodes: chapter.qualityDebt?.issueCodes ?? [],
      reason: chapter.qualityDebt?.reason ?? "",
      repairAttemptsUsed: chapter.qualityDebt?.repairAttemptsUsed ?? null,
    }));

  const chapterByOrder = new Map(chapters.map((chapter) => [chapter.order, chapter]));
  const assignedOrders = new Set<number>();
  const volumeProgress = [...input.volumes]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((volume) => {
      const orders = volume.chapters?.map((chapter) => chapter.chapterOrder) ?? [];
      for (const order of orders) {
        assignedOrders.add(order);
      }
      const volumeChapters = orders
        .map((order) => chapterByOrder.get(order))
        .filter((chapter): chapter is ProductionBoardChapterInput => Boolean(chapter));
      const completedChapters = volumeChapters.filter((chapter) => chapter.status === "completed").length;
      const attentionCount = volumeChapters.filter((chapter) => ATTENTION_STATUSES.includes(chapter.status)).length;
      return {
        volumeId: volume.id,
        title: volume.title,
        totalChapters: volumeChapters.length,
        completedChapters,
        attentionChapters: attentionCount,
        ratio: volumeChapters.length > 0 ? completedChapters / volumeChapters.length : 0,
      };
    });

  const unassignedChapterCount = chapters.filter((chapter) => !assignedOrders.has(chapter.order)).length;

  const wordCountByVolume = volumeProgress.map((volume, index) => {
    const volumeChapters = (input.volumes.find((item) => item.id === volume.volumeId)?.chapters ?? [])
      .map((chapter) => chapterByOrder.get(chapter.chapterOrder))
      .filter((chapter): chapter is ProductionBoardChapterInput => Boolean(chapter));
    return {
      name: `第 ${index + 1} 卷`,
      wordCount: volumeChapters.reduce((sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0), 0),
    };
  });
  const unassignedWordCount = chapters
    .filter((chapter) => !assignedOrders.has(chapter.order))
    .reduce((sum, chapter) => sum + Math.max(0, chapter.wordCount ?? 0), 0);
  if (unassignedWordCount > 0) {
    wordCountByVolume.push({ name: "未挂卷", wordCount: unassignedWordCount });
  }

  const issueCodeCounts = new Map<string, number>();
  for (const chapter of chapters) {
    for (const code of chapter.qualityDebt?.issueCodes ?? []) {
      issueCodeCounts.set(code, (issueCodeCounts.get(code) ?? 0) + 1);
    }
  }
  const debtIssueCounts = Array.from(issueCodeCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
    .slice(0, 8);

  return {
    totalChapters,
    totalWordCount,
    completionRatio: totalChapters > 0 ? completedCount / totalChapters : 0,
    statusCounts,
    attentionChapters,
    debtHotspots,
    volumeProgress,
    unassignedChapterCount,
    wordCountByVolume,
    debtIssueCounts,
  };
}
