import type { ContextBlockTier, ContextGatingDecision, GenerationContextPackage } from "@ai-novel/shared/types/chapterRuntime";

export type ChapterContextProviderStage = "write" | "review" | "repair" | "preview";

export interface ChapterContextProviderContract {
  id: string;
  stages: readonly ChapterContextProviderStage[];
  inputDependencies: readonly string[];
  priority: number;
  tier: ContextBlockTier;
  required: boolean;
  tokenBudget: number;
  failureSemantics: "block" | "degrade" | "omit";
}

export const CHAPTER_CONTEXT_PROVIDER_CONTRACTS: readonly ChapterContextProviderContract[] = [
  { id: "character_hard_facts", stages: ["write", "review", "repair"], inputDependencies: ["characterRoster", "characterHardFacts"], priority: 120, tier: "hard_required", required: true, tokenBudget: 900, failureSemantics: "block" },
  { id: "previous_chapter_result", stages: ["write", "review", "repair"], inputDependencies: ["chapterOrder", "previousChapterTail", "previousChaptersSummary"], priority: 115, tier: "hard_required", required: true, tokenBudget: 700, failureSemantics: "block" },
  { id: "chapter_obligations", stages: ["write", "review", "repair"], inputDependencies: ["plan", "chapterMission"], priority: 125, tier: "hard_required", required: true, tokenBudget: 800, failureSemantics: "block" },
  // INN-A1b A1-G8:伏笔台账注入遥测 —— 有在册伏笔时记录是否真的进入上下文,缺失按降级语义继续。
  { id: "payoff_ledger", stages: ["write"], inputDependencies: ["ledgerPendingItems", "ledgerUrgentItems", "ledgerOverdueItems", "ledgerSummary"], priority: 95, tier: "situational", required: false, tokenBudget: 500, failureSemantics: "degrade" },
  { id: "world_context", stages: ["write", "review", "repair", "preview"], inputDependencies: ["novelId", "storyWorldSlice"], priority: 90, tier: "situational", required: false, tokenBudget: 700, failureSemantics: "degrade" },
  { id: "rag_context", stages: ["write", "review", "repair", "preview"], inputDependencies: ["chapterMission", "novelId"], priority: 60, tier: "optional", required: false, tokenBudget: 900, failureSemantics: "omit" },
  // INN-A3 分层递归记忆:后段章节的全书快照与卷内回顾,缺失按降级语义继续并被 gating 记录。
  { id: "book_state_snapshot", stages: ["write"], inputDependencies: ["canonicalTimeline"], priority: 91, tier: "situational", required: false, tokenBudget: 450, failureSemantics: "degrade" },
  { id: "volume_recap", stages: ["write"], inputDependencies: ["volumePlans", "chapterSummary"], priority: 89, tier: "situational", required: false, tokenBudget: 450, failureSemantics: "degrade" },
  // INN-A4 角色弧线:参与者近期演变轨迹,缺失按降级语义继续并被 gating 记录。
  { id: "character_arc", stages: ["write"], inputDependencies: ["characterTimeline"], priority: 90, tier: "situational", required: false, tokenBudget: 350, failureSemantics: "degrade" },
] as const;

export function evaluateChapterContextProviderContracts(input: {
  stage: ChapterContextProviderStage;
  chapterOrder: number;
  contextPackage: Pick<GenerationContextPackage, "characterRoster" | "characterHardFacts" | "plan" | "chapterMission" | "previousChapterTail" | "previousChaptersSummary" | "storyWorldSlice" | "ragContext" | "bookStateSnapshot" | "volumeRecap" | "characterArcEvents" | "ledgerPendingItems" | "ledgerUrgentItems" | "ledgerOverdueItems" | "ledgerSummary">;
}): ContextGatingDecision[] {
  const decisions: ContextGatingDecision[] = [];
  for (const contract of CHAPTER_CONTEXT_PROVIDER_CONTRACTS) {
    if (!contract.stages.includes(input.stage)) continue;
    let applicable = true;
    let available = true;
    let reason = "已提供";
    if (contract.id === "character_hard_facts") {
      applicable = input.contextPackage.characterRoster.length > 0;
      available = input.contextPackage.characterHardFacts.length > 0;
      reason = available ? "角色硬事实已提供" : "适用章节缺少角色硬事实";
    } else if (contract.id === "previous_chapter_result") {
      applicable = input.chapterOrder > 1;
      available = Boolean(input.contextPackage.previousChapterTail?.trim()) || input.contextPackage.previousChaptersSummary.length > 0;
      reason = available ? "上一章实际结果已提供" : "当前章节缺少上一章实际结果";
    } else if (contract.id === "chapter_obligations") {
      available = Boolean(input.contextPackage.plan) && Boolean(input.contextPackage.chapterMission);
      reason = available ? "章节义务已提供" : "章节规划或任务义务缺失";
    } else if (contract.id === "payoff_ledger") {
      // 兼容旧上下文包:账本字段缺失时按"无账本"处理,不阻塞生成。
      const ledgerItemCount = (input.contextPackage.ledgerPendingItems?.length ?? 0)
        + (input.contextPackage.ledgerUrgentItems?.length ?? 0)
        + (input.contextPackage.ledgerOverdueItems?.length ?? 0);
      applicable = ledgerItemCount > 0 || (input.contextPackage.ledgerSummary?.totalCount ?? 0) > 0;
      available = ledgerItemCount > 0 && Boolean(input.contextPackage.ledgerSummary);
      reason = available
        ? "伏笔账本已进入注入上下文"
        : "账本有记录但注入上下文缺失，按降级语义继续";
    } else if (contract.id === "world_context") {
      available = Boolean(input.contextPackage.storyWorldSlice);
      reason = available ? "世界上下文已提供" : "没有可用世界切片，按降级语义继续";
    } else if (contract.id === "rag_context") {
      available = Boolean(input.contextPackage.ragContext?.trim());
      reason = available ? "知识库上下文已提供" : "知识库未返回匹配内容，按可选语义跳过";
    } else if (contract.id === "book_state_snapshot") {
      applicable = input.chapterOrder > 3;
      available = (input.contextPackage.bookStateSnapshot ?? []).length > 0;
      reason = available
        ? "全书状态快照已提供"
        : applicable ? "后段章节缺少全书状态快照，按降级语义继续" : "早期章节暂不需要全书快照";
    } else if (contract.id === "volume_recap") {
      applicable = input.chapterOrder > 3;
      available = (input.contextPackage.volumeRecap ?? []).length > 0;
      reason = available
        ? "卷内回顾已提供"
        : applicable ? "后段章节缺少卷内回顾，按降级语义继续" : "早期章节暂不需要卷内回顾";
    } else if (contract.id === "character_arc") {
      applicable = input.chapterOrder > 3;
      available = Object.values(input.contextPackage.characterArcEvents ?? {}).some((lines) => lines.length > 0);
      reason = available
        ? "角色弧线事件已提供"
        : applicable ? "后段章节缺少角色弧线事件，按降级语义继续" : "早期章节暂不需要角色弧线";
    }
    if (applicable) decisions.push({ blockId: contract.id, tier: contract.tier, included: available, reason });
  }
  return decisions;
}

export function getBlockingChapterContextGaps(decisions: ContextGatingDecision[]): string[] {
  const required = new Set(CHAPTER_CONTEXT_PROVIDER_CONTRACTS.filter((item) => item.required).map((item) => item.id));
  return decisions.filter((item) => required.has(item.blockId) && !item.included).map((item) => `${item.blockId}: ${item.reason ?? "必需上下文缺失"}`);
}
