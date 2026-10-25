// UI-1 第三批 C · 世界样本卡片引导(LOOP-34):
// 纯函数推导世界样本的当前状态、可用于哪些创作步骤、下一步推荐动作。
// 只读投影输入,不发起请求;判定规则确定性,便于单测。

export interface WorldLibraryProjectionLike {
  ruleCount: number;
  forceCount: number;
  locationCount: number;
  relationCount: number;
}

export interface WorldGuidance {
  status: "未整理" | "可起步" | "较完整";
  statusTone: "muted" | "warning" | "success";
  /** 已具备的世界资产可直接支撑的创作步骤(按工作流顺序)。 */
  usableSteps: string[];
  /** 下一步推荐:优先补最基础的缺失项;齐备后引导推送到小说。 */
  nextAction: string;
}

function hasCount(count: number): boolean {
  return count > 0;
}

export function resolveWorldGuidance(projection: WorldLibraryProjectionLike): WorldGuidance {
  const dimensions = [projection.ruleCount, projection.forceCount, projection.locationCount, projection.relationCount];
  const filled = dimensions.filter(hasCount).length;

  const status: WorldGuidance["status"] = filled === 0
    ? "未整理"
    : filled <= 2
      ? "可起步"
      : "较完整";
  const statusTone: WorldGuidance["statusTone"] = status === "未整理"
    ? "warning"
    : status === "可起步"
      ? "muted"
      : "success";

  const usableSteps: string[] = [];
  if (hasCount(projection.ruleCount)) usableSteps.push("正文生成");
  if (hasCount(projection.forceCount)) usableSteps.push("角色准备");
  if (hasCount(projection.locationCount)) usableSteps.push("卷战略 / 卷骨架");
  if (hasCount(projection.relationCount)) usableSteps.push("节奏 / 拆章");

  const nextAction = !hasCount(projection.ruleCount)
    ? "补充核心世界规则"
    : !hasCount(projection.forceCount)
      ? "补充主要势力"
      : !hasCount(projection.locationCount)
        ? "标记故事地点"
        : !hasCount(projection.relationCount)
          ? "整理势力与地点关系"
          : "推送到小说作为本书世界底板";

  return { status, statusTone, usableSteps, nextAction };
}
