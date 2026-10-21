import { useState } from "react";
import type { VolumePlan } from "@ai-novel/shared/types/novel";
import {
  buildVolumeWorkspaceDiff,
  type VolumeWorkspaceDiff,
} from "../components/structuredOutline/volumeWorkspaceDiff";

// INN-C3 规划保存门禁:先对比草稿与已保存规划,有改动时交给确认弹窗。
export type PlanningSaveTarget = "volume_strategy" | "structured_outline";

export interface PendingPlanningSave {
  target: PlanningSaveTarget;
  diff: VolumeWorkspaceDiff;
}

export function usePlanningSavePreview(input: {
  savedVolumes: VolumePlan[];
  draftVolumes: VolumePlan[];
  onSave: (target: PlanningSaveTarget) => void;
}) {
  const [pendingPlanSave, setPendingPlanSave] = useState<PendingPlanningSave | null>(null);

  const requestPlanSave = (target: PlanningSaveTarget) => {
    const diff = buildVolumeWorkspaceDiff({
      baseline: input.savedVolumes,
      draft: input.draftVolumes,
    });
    if (input.savedVolumes.length === 0 || !diff.hasChanges) {
      input.onSave(target);
      return;
    }
    setPendingPlanSave({ target, diff });
  };

  const confirmPendingPlanSave = () => {
    if (!pendingPlanSave) {
      return;
    }
    input.onSave(pendingPlanSave.target);
    setPendingPlanSave(null);
  };

  const closePlanSavePreview = () => setPendingPlanSave(null);

  return {
    pendingPlanSave,
    requestPlanSave,
    confirmPendingPlanSave,
    closePlanSavePreview,
  };
}
