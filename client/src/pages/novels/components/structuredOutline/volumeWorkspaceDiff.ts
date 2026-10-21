import type { VolumeChapterPlan, VolumePlan } from "@ai-novel/shared/types/novel";

// INN-C3 规划落盘前的改动预览:纯函数对比已保存文档与当前草稿,供保存确认弹窗使用。
export interface VolumeWorkspaceVolumeDiffItem {
  id: string;
  title: string;
  chapterCount: number;
  fields: string[];
}

export interface VolumeWorkspaceChapterDiffItem {
  id: string;
  title: string;
  volumeTitle: string;
  fromOrder: number | null;
  toOrder: number | null;
  fromVolumeTitle: string | null;
  fields: string[];
}

export interface VolumeWorkspaceDiff {
  hasChanges: boolean;
  totalChangedChapters: number;
  addedVolumes: VolumeWorkspaceVolumeDiffItem[];
  removedVolumes: VolumeWorkspaceVolumeDiffItem[];
  updatedVolumes: VolumeWorkspaceVolumeDiffItem[];
  addedChapters: VolumeWorkspaceChapterDiffItem[];
  removedChapters: VolumeWorkspaceChapterDiffItem[];
  movedChapters: VolumeWorkspaceChapterDiffItem[];
  updatedChapters: VolumeWorkspaceChapterDiffItem[];
}

const VOLUME_FIELD_LABELS: Array<{ key: keyof VolumePlan; label: string }> = [
  { key: "title", label: "标题" },
  { key: "sortOrder", label: "卷序" },
  { key: "summary", label: "摘要" },
  { key: "mainPromise", label: "核心承诺" },
];

const CHAPTER_FIELD_LABELS: Array<{ key: keyof VolumeChapterPlan; label: string }> = [
  { key: "title", label: "标题" },
  { key: "summary", label: "摘要" },
  { key: "purpose", label: "作用" },
  { key: "exclusiveEvent", label: "独占事件" },
  { key: "targetWordCount", label: "目标字数" },
  { key: "conflictLevel", label: "冲突强度" },
];

function normalizeValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return value == null ? "" : String(value);
}

function collectChangedFields<T extends object>(
  baseline: T,
  draft: T,
  labels: Array<{ key: keyof T; label: string }>,
): string[] {
  return labels
    .filter(({ key }) => normalizeValue(baseline[key]) !== normalizeValue(draft[key]))
    .map(({ label }) => label);
}

function volumeTitle(volume: VolumePlan): string {
  return volume.title.trim() || `第${volume.sortOrder}卷`;
}

interface ChapterLocation {
  volume: VolumePlan;
  chapter: VolumeChapterPlan;
}

export function buildVolumeWorkspaceDiff(input: {
  baseline: VolumePlan[];
  draft: VolumePlan[];
}): VolumeWorkspaceDiff {
  const baselineVolumes = new Map(input.baseline.map((volume) => [volume.id, volume]));
  const draftVolumes = new Map(input.draft.map((volume) => [volume.id, volume]));

  const baselineChapters = new Map<string, ChapterLocation>();
  for (const volume of input.baseline) {
    for (const chapter of volume.chapters ?? []) {
      baselineChapters.set(chapter.id, { volume, chapter });
    }
  }
  const draftChapters = new Map<string, ChapterLocation>();
  for (const volume of input.draft) {
    for (const chapter of volume.chapters ?? []) {
      draftChapters.set(chapter.id, { volume, chapter });
    }
  }

  const addedVolumes = input.draft
    .filter((volume) => !baselineVolumes.has(volume.id))
    .map((volume) => ({
      id: volume.id,
      title: volumeTitle(volume),
      chapterCount: volume.chapters?.length ?? 0,
      fields: [],
    }));

  const removedVolumes = input.baseline
    .filter((volume) => !draftVolumes.has(volume.id))
    .map((volume) => ({
      id: volume.id,
      title: volumeTitle(volume),
      chapterCount: volume.chapters?.length ?? 0,
      fields: [],
    }));

  const updatedVolumes = input.draft.flatMap((volume) => {
    const baseline = baselineVolumes.get(volume.id);
    if (!baseline) {
      return [];
    }
    const fields = collectChangedFields(baseline, volume, VOLUME_FIELD_LABELS);
    if (fields.length === 0) {
      return [];
    }
    return [{
      id: volume.id,
      title: volumeTitle(volume),
      chapterCount: volume.chapters?.length ?? 0,
      fields,
    }];
  });

  const addedChapters: VolumeWorkspaceChapterDiffItem[] = [];
  const movedChapters: VolumeWorkspaceChapterDiffItem[] = [];
  const updatedChapters: VolumeWorkspaceChapterDiffItem[] = [];

  for (const volume of input.draft) {
    for (const chapter of volume.chapters ?? []) {
      const baseline = baselineChapters.get(chapter.id);
      if (!baseline) {
        addedChapters.push({
          id: chapter.id,
          title: chapter.title.trim() || `第${chapter.chapterOrder}章`,
          volumeTitle: volumeTitle(volume),
          fromOrder: null,
          toOrder: chapter.chapterOrder,
          fromVolumeTitle: null,
          fields: [],
        });
        continue;
      }
      if (baseline.volume.id !== volume.id) {
        movedChapters.push({
          id: chapter.id,
          title: chapter.title.trim() || `第${chapter.chapterOrder}章`,
          volumeTitle: volumeTitle(volume),
          fromOrder: baseline.chapter.chapterOrder,
          toOrder: chapter.chapterOrder,
          fromVolumeTitle: volumeTitle(baseline.volume),
          fields: [],
        });
        continue;
      }
      if (baseline.chapter.chapterOrder !== chapter.chapterOrder) {
        movedChapters.push({
          id: chapter.id,
          title: chapter.title.trim() || `第${chapter.chapterOrder}章`,
          volumeTitle: volumeTitle(volume),
          fromOrder: baseline.chapter.chapterOrder,
          toOrder: chapter.chapterOrder,
          fromVolumeTitle: null,
          fields: [],
        });
        continue;
      }
      const fields = collectChangedFields(baseline.chapter, chapter, CHAPTER_FIELD_LABELS);
      if (fields.length > 0) {
        updatedChapters.push({
          id: chapter.id,
          title: chapter.title.trim() || `第${chapter.chapterOrder}章`,
          volumeTitle: volumeTitle(volume),
          fromOrder: baseline.chapter.chapterOrder,
          toOrder: chapter.chapterOrder,
          fromVolumeTitle: null,
          fields,
        });
      }
    }
  }

  const removedChapters = [...baselineChapters.entries()]
    .filter(([id]) => !draftChapters.has(id))
    .map(([, location]) => ({
      id: location.chapter.id,
      title: location.chapter.title.trim() || `第${location.chapter.chapterOrder}章`,
      volumeTitle: volumeTitle(location.volume),
      fromOrder: location.chapter.chapterOrder,
      toOrder: null,
      fromVolumeTitle: null,
      fields: [],
    }));

  addedChapters.sort((left, right) => (left.toOrder ?? 0) - (right.toOrder ?? 0));
  movedChapters.sort((left, right) => (left.toOrder ?? 0) - (right.toOrder ?? 0));
  updatedChapters.sort((left, right) => (left.toOrder ?? 0) - (right.toOrder ?? 0));
  removedChapters.sort((left, right) => (left.fromOrder ?? 0) - (right.fromOrder ?? 0));

  const totalChangedChapters = addedChapters.length
    + removedChapters.length
    + movedChapters.length
    + updatedChapters.length;

  return {
    hasChanges: totalChangedChapters > 0
      || addedVolumes.length > 0
      || removedVolumes.length > 0
      || updatedVolumes.length > 0,
    totalChangedChapters,
    addedVolumes,
    removedVolumes,
    updatedVolumes,
    addedChapters,
    removedChapters,
    movedChapters,
    updatedChapters,
  };
}
