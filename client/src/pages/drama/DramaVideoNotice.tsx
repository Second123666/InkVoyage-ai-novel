import { Info } from "lucide-react";

export function DramaVideoNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-5">
        实验特性：视频成片默认使用模拟演示通道，未接入真实视频生成服务时不会产出真实视频。素材整理、分集与台本流程不受影响。
      </p>
    </div>
  );
}
