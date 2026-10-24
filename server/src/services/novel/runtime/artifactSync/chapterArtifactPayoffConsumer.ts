import { prisma } from "../../../../db/prisma";
import {
  clearStaleRiskSignal,
  dedupeRiskSignals,
  sanitizePayoffLedgerSyncItem,
  serializeLedgerJson,
} from "../../../payoff/payoffLedgerShared";
import {
  assertExpectedChapterContentInTransaction,
  normalizeLedgerKey,
  resolveChapterReference,
  type ChapterReference,
} from "./chapterArtifactDelta.shared";
import type { ChapterArtifactDeltaOutput } from "../../../../prompting/prompts/novel/chapterArtifactDelta.prompts";

// 章节资产消费者:伏笔账本增量(拆分自 ChapterArtifactDeltaService.ts,RF-1)。
export async function applyPayoffDeltasInternal(input: {
    novelId: string;
    chapterId: string;
    chapterOrder: number;
    chapterTitle: string;
    chapters: ChapterReference[];
    output: ChapterArtifactDeltaOutput;
    stateSnapshotId: string | null;
    expectedChapterContent: string;
  }): Promise<number> {
    if (input.output.payoffDeltas.length === 0) {
      return 0;
    }
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await assertExpectedChapterContentInTransaction(tx, input);
      for (const rawDelta of input.output.payoffDeltas) {
        const ledgerKey = normalizeLedgerKey(rawDelta.ledgerKey, normalizeLedgerKey(rawDelta.title, `chapter_${input.chapterOrder}_payoff`));
        // A1-G22:增量路径与全量对账共用同一守卫(无目标窗口的 overdue 降级回待推进),
        // 杜绝两条写路径语义不一致。
        const item = sanitizePayoffLedgerSyncItem({ ...rawDelta, ledgerKey });
        const previous = await tx.payoffLedgerItem.findUnique({
          where: {
            novelId_ledgerKey: {
              novelId: input.novelId,
              ledgerKey,
            },
          },
        });
        // A1-G10:手动锁定条目不接受增量路径改写状态/原因/窗口。
        const lockedByUser = previous?.manualLocked === true;
        const setupChapterId = resolveChapterReference({
          value: item.setupChapterId ?? item.setupChapterOrder ?? item.firstSeenChapterOrder,
          chapters: input.chapters,
          currentChapterId: input.chapterId,
          fallbackToCurrentChapter: item.currentStatus === "setup" || item.currentStatus === "hinted",
        }) ?? previous?.setupChapterId ?? null;
        const payoffChapterId = resolveChapterReference({
          value: item.payoffChapterId ?? item.payoffChapterOrder,
          chapters: input.chapters,
          currentChapterId: input.chapterId,
          fallbackToCurrentChapter: item.currentStatus === "paid_off",
        }) ?? previous?.payoffChapterId ?? null;
        const lastTouchedChapterId = resolveChapterReference({
          value: item.lastTouchedChapterOrder,
          chapters: input.chapters,
          currentChapterId: input.chapterId,
          fallbackToCurrentChapter: true,
        }) ?? input.chapterId;
        const sourceRefs = item.sourceRefs.length > 0
          ? item.sourceRefs.map((ref) => ({
            ...ref,
            chapterId: ref.chapterId ?? lastTouchedChapterId,
            chapterOrder: ref.chapterOrder ?? input.chapterOrder,
          }))
          : [{
            kind: "chapter_payoff_ref" as const,
            refId: null,
            refLabel: `第${input.chapterOrder}章《${input.chapterTitle}》`,
            chapterId: input.chapterId,
            chapterOrder: input.chapterOrder,
            volumeId: null,
            volumeSortOrder: null,
          }];
        const evidence = item.evidence.length > 0
          ? item.evidence.map((evidenceItem) => ({
            ...evidenceItem,
            chapterId: evidenceItem.chapterId ?? input.chapterId,
            chapterOrder: evidenceItem.chapterOrder ?? input.chapterOrder,
          }))
          : [{
            summary: item.summary,
            chapterId: input.chapterId,
            chapterOrder: input.chapterOrder,
          }];
        const riskSignals = clearStaleRiskSignal(dedupeRiskSignals(item.riskSignals.map((signal) => ({
          code: signal.code,
          severity: signal.severity,
          summary: signal.summary,
        }))));
        await tx.payoffLedgerItem.upsert({
          where: {
            novelId_ledgerKey: {
              novelId: input.novelId,
              ledgerKey,
            },
          },
          create: {
            novelId: input.novelId,
            ledgerKey,
            title: item.title,
            summary: item.summary,
            scopeType: item.scopeType,
            currentStatus: item.currentStatus,
            targetStartChapterOrder: item.targetStartChapterOrder ?? null,
            targetEndChapterOrder: item.targetEndChapterOrder ?? null,
            firstSeenChapterOrder: item.firstSeenChapterOrder ?? input.chapterOrder,
            lastTouchedChapterOrder: item.lastTouchedChapterOrder ?? input.chapterOrder,
            lastTouchedChapterId,
            setupChapterId,
            payoffChapterId,
            lastSnapshotId: input.stateSnapshotId,
            sourceRefsJson: serializeLedgerJson(sourceRefs),
            evidenceJson: serializeLedgerJson(evidence),
            riskSignalsJson: serializeLedgerJson(riskSignals),
            statusReason: item.statusReason?.trim() || null,
            confidence: item.confidence ?? null,
            updatedAt: now,
          },
          update: {
            title: item.title,
            summary: item.summary,
            scopeType: item.scopeType,
            currentStatus: lockedByUser ? previous.currentStatus : item.currentStatus,
            targetStartChapterOrder: lockedByUser
              ? previous.targetStartChapterOrder
              : item.targetStartChapterOrder ?? null,
            targetEndChapterOrder: lockedByUser
              ? previous.targetEndChapterOrder
              : item.targetEndChapterOrder ?? null,
            firstSeenChapterOrder: item.firstSeenChapterOrder ?? previous?.firstSeenChapterOrder ?? input.chapterOrder,
            lastTouchedChapterOrder: item.lastTouchedChapterOrder ?? input.chapterOrder,
            lastTouchedChapterId,
            setupChapterId,
            payoffChapterId,
            lastSnapshotId: input.stateSnapshotId ?? previous?.lastSnapshotId ?? null,
            sourceRefsJson: serializeLedgerJson(sourceRefs),
            evidenceJson: serializeLedgerJson(evidence),
            riskSignalsJson: serializeLedgerJson(riskSignals),
            statusReason: lockedByUser ? previous.statusReason : item.statusReason?.trim() || null,
            confidence: item.confidence ?? null,
            updatedAt: now,
          },
        });
      }
    });
    return input.output.payoffDeltas.length;
  }
export { applyPayoffDeltasInternal as applyPayoffDeltas };
