import { Info } from "lucide-react";

export function ComicImageGenerationNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="leading-5">
        临时提示：漫画图片生成暂只支持 gpt-image-2。请选择已配置该模型的图片服务后再生成角色设计稿或格子图。
      </p>
    </div>
  );
}
