// INN-A3 分层递归记忆:全书状态快照与卷内回顾的纯文本装配。
// 纯函数、无 IO:卷定位与格式化在装配前完成,正文 writer 只拿到现成行。

const MAX_BOOK_STATE_EVENTS = 8;
const MAX_VOLUME_RECAP_CHAPTERS = 8;
const SNIPPET_LIMIT = 100;

function snippet(text: string | null | undefined): string {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "—";
  }
  return normalized.length > SNIPPET_LIMIT ? `${normalized.slice(0, SNIPPET_LIMIT)}…` : normalized;
}

/**
 * 全书状态快照:取当前章之前已发生的关键时间线事件,按章序取最近 N 条。
 */
export function buildBookStateSnapshotLines(
  timeline: Array<{ chapterOrder?: number | null; title: string; summary: string }>,
  chapterOrder: number,
): string[] {
  return timeline
    .filter((event) => event.chapterOrder == null || event.chapterOrder < chapterOrder)
    .slice()
    .sort((left, right) => (left.chapterOrder ?? Number.MAX_SAFE_INTEGER) - (right.chapterOrder ?? Number.MAX_SAFE_INTEGER))
    .slice(-MAX_BOOK_STATE_EVENTS)
    .map((event) => `第${event.chapterOrder ?? "?"}章 ${event.title || "时间线事件"}: ${snippet(event.summary)}`);
}

/**
 * 定位当前章所在卷的全部章序;章节计划未覆盖当前章时返回 null。
 */
export function resolveCurrentVolumeChapterOrders(
  volumeRows: Array<{ chapters: Array<{ chapterOrder: number }> }>,
  chapterOrder: number,
): number[] | null {
  const currentVolume = volumeRows.find((volume) =>
    volume.chapters.some((chapterRef) => chapterRef.chapterOrder === chapterOrder),
  );
  if (!currentVolume) {
    return null;
  }
  return currentVolume.chapters.map((chapterRef) => chapterRef.chapterOrder);
}

/**
 * 卷内回顾:输入按章序升序的章节摘要行,取当前章之前、卷内最近 N 条。
 */
export function buildVolumeRecapLines(
  summaryRows: Array<{ summary: string; chapter: { order: number } }>,
  currentChapterOrder: number,
): string[] {
  return summaryRows
    .filter((row) => row.chapter.order < currentChapterOrder)
    .slice(-MAX_VOLUME_RECAP_CHAPTERS)
    .map((row) => `第${row.chapter.order}章 ${snippet(row.summary)}`);
}
