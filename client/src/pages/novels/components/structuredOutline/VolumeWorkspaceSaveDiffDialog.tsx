import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import type { VolumeWorkspaceChapterDiffItem, VolumeWorkspaceDiff } from "./volumeWorkspaceDiff";

// INN-C3 规划保存确认:先把这次要落盘的卷/章节改动摊开,确认后再写入。
interface VolumeWorkspaceSaveDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diff: VolumeWorkspaceDiff | null;
  syncToChapterExecution: boolean;
  isSaving: boolean;
  onConfirm: () => void;
}

function ChapterRow(props: { item: VolumeWorkspaceChapterDiffItem; detail: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 truncate text-foreground">
        {props.item.volumeTitle} · {props.item.title}
      </span>
      <span className="shrink-0 text-muted-foreground">{props.detail}</span>
    </div>
  );
}

export default function VolumeWorkspaceSaveDiffDialog(props: VolumeWorkspaceSaveDiffDialogProps) {
  const { open, onOpenChange, diff, syncToChapterExecution, isSaving, onConfirm } = props;
  const hasChanges = Boolean(diff?.hasChanges);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        title="确认保存规划改动"
        description="保存前先核对这次会改动哪些卷和章节；确认后才会写入这本书的规划。"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              返回检查
            </Button>
            <Button type="button" onClick={onConfirm} disabled={!hasChanges || isSaving}>
              {isSaving ? "保存中..." : "确认保存"}
            </Button>
          </div>
        )}
      >
        {diff && hasChanges ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {diff.addedVolumes.length > 0 ? <Badge>新增卷 {diff.addedVolumes.length}</Badge> : null}
              {diff.removedVolumes.length > 0 ? <Badge variant="secondary">移除卷 {diff.removedVolumes.length}</Badge> : null}
              {diff.updatedVolumes.length > 0 ? <Badge variant="outline">卷信息调整 {diff.updatedVolumes.length}</Badge> : null}
              {diff.addedChapters.length > 0 ? <Badge>新增章节 {diff.addedChapters.length}</Badge> : null}
              {diff.removedChapters.length > 0 ? <Badge variant="secondary">移除章节 {diff.removedChapters.length}</Badge> : null}
              {diff.movedChapters.length > 0 ? <Badge variant="outline">移动章节 {diff.movedChapters.length}</Badge> : null}
              {diff.updatedChapters.length > 0 ? <Badge variant="outline">修改章节 {diff.updatedChapters.length}</Badge> : null}
            </div>

            {diff.addedVolumes.length > 0 ? (
              <section className="space-y-2">
                <div className="text-sm font-medium text-foreground">新增卷</div>
                {diff.addedVolumes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-foreground">{item.title}</span>
                    <span className="text-muted-foreground">{item.chapterCount} 章</span>
                  </div>
                ))}
              </section>
            ) : null}

            {diff.removedVolumes.length > 0 ? (
              <section className="space-y-2">
                <div className="text-sm font-medium text-foreground">移除卷</div>
                {diff.removedVolumes.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-foreground">{item.title}</span>
                    <span className="text-muted-foreground">{item.chapterCount} 章</span>
                  </div>
                ))}
              </section>
            ) : null}

            {diff.updatedVolumes.length > 0 ? (
              <section className="space-y-2">
                <div className="text-sm font-medium text-foreground">卷信息调整</div>
                {diff.updatedVolumes.map((item) => (
                  <div key={item.id} className="flex flex-col gap-1 rounded-lg bg-muted/30 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 truncate text-foreground">{item.title}</span>
                    <span className="shrink-0 text-muted-foreground">调整：{item.fields.join("、")}</span>
                  </div>
                ))}
              </section>
            ) : null}

            {diff.addedChapters.length > 0 ? (
              <section className="space-y-2">
                <div className="text-sm font-medium text-foreground">新增章节</div>
                {diff.addedChapters.map((item) => (
                  <ChapterRow key={item.id} item={item} detail={`放到第 ${item.toOrder} 章`} />
                ))}
              </section>
            ) : null}

            {diff.removedChapters.length > 0 ? (
              <section className="space-y-2">
                <div className="text-sm font-medium text-foreground">移除章节</div>
                {diff.removedChapters.map((item) => (
                  <ChapterRow key={item.id} item={item} detail={`原第 ${item.fromOrder} 章`} />
                ))}
              </section>
            ) : null}

            {diff.movedChapters.length > 0 ? (
              <section className="space-y-2">
                <div className="text-sm font-medium text-foreground">移动章节</div>
                {diff.movedChapters.map((item) => (
                  <ChapterRow
                    key={item.id}
                    item={item}
                    detail={item.fromVolumeTitle
                      ? `${item.fromVolumeTitle}第 ${item.fromOrder} 章 → ${item.volumeTitle}第 ${item.toOrder} 章`
                      : `第 ${item.fromOrder} 章 → 第 ${item.toOrder} 章`}
                  />
                ))}
              </section>
            ) : null}

            {diff.updatedChapters.length > 0 ? (
              <section className="space-y-2">
                <div className="text-sm font-medium text-foreground">章节内容调整</div>
                {diff.updatedChapters.map((item) => (
                  <ChapterRow key={item.id} item={item} detail={`调整：${item.fields.join("、")}`} />
                ))}
              </section>
            ) : null}

            {syncToChapterExecution ? (
              <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
                保存后会同步到章节执行区；已有章节正文会保留，卷纲外的章节不会自动删除。
              </div>
            ) : (
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                保存后会记录为新的规划版本，之后仍可在版本历史里查看差异。
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            当前草稿与已保存的规划一致，可以直接保存。
          </div>
        )}
      </AppDialogContent>
    </Dialog>
  );
}
