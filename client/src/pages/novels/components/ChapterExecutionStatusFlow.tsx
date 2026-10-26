import { cn } from "@/lib/utils";
import type {
  ChapterExecutionFlowStage,
  ChapterExecutionFlowStageKey,
  ChapterExecutionFlowStageStatus,
} from "./chapterExecution.shared";

interface ChapterExecutionStatusFlowProps {
  stages: ChapterExecutionFlowStage[];
  currentStageKey: ChapterExecutionFlowStageKey;
  currentStageNote: string;
}

function toneClassName(status: ChapterExecutionFlowStageStatus, isCurrent: boolean): string {
  if (isCurrent) {
    return "border-info/40 bg-info/10 text-info";
  }
  if (status === "done") {
    return "border-success/40 bg-success/10 text-success";
  }
  return "border-border/70 bg-background text-muted-foreground";
}

function dotClassName(status: ChapterExecutionFlowStageStatus, isCurrent: boolean): string {
  if (isCurrent) {
    return "bg-info";
  }
  if (status === "done") {
    return "bg-success";
  }
  return "bg-muted-foreground/30";
}

export default function ChapterExecutionStatusFlow(props: ChapterExecutionStatusFlowProps) {
  const { stages, currentStageKey, currentStageNote } = props;

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        {stages.map((stage) => {
          const isCurrent = stage.key === currentStageKey;
          return (
            <div
              key={stage.key}
              className={cn(
                "flex min-w-[108px] flex-1 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                toneClassName(stage.status, isCurrent),
              )}
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassName(stage.status, isCurrent))} />
              <span className="truncate">{stage.label}</span>
            </div>
          );
        })}
      </div>
      <div className="text-xs leading-6 text-muted-foreground">
        <span className="font-medium text-foreground">
          当前阶段：
          {stages.find((stage) => stage.key === currentStageKey)?.label ?? "未开始"}
        </span>
        <span className="ml-2">{currentStageNote}</span>
      </div>
    </div>
  );
}
