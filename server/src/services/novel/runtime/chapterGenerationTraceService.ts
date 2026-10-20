// INN-B1 全链路 Trace:把"这一章为什么这么写"的上下文装配、模型参数、审核与验收决策
// 在定稿时快照为结构化轨迹,提供只读回放。纯诊断数据,写入失败不得影响主链。
import type { ChapterRuntimePackage, GenerationContextPackage } from "@ai-novel/shared/types/chapterRuntime";
import type { ChapterAcceptanceAssessmentOutput } from "../../../prompting/prompts/novel/chapterAcceptance.prompts";
import { prisma } from "../../../db/prisma";

export interface ChapterGenerationTraceSections {
  context: {
    gatingDecisions: GenerationContextPackage["contextGatingDecisions"];
    compression: GenerationContextPackage["contextCompressionLog"];
  };
  generation: {
    provider: string | null;
    model: string | null;
    temperature: number | null;
    runId: string | null;
  };
  audit: {
    overallScore: number | null;
    reports: Array<{ auditType: string; overallScore: number | null; issueCodes: string[] }>;
    openIssueCodes: string[];
    hasBlockingIssues: boolean;
  };
  decision: {
    acceptanceStatus: string | null;
    repairability: string | null;
    decisionReason: string | null;
    failureCode: string | null;
    replanRecommended: boolean | null;
    replanAction: string | null;
    replanReason: string | null;
  };
}

export function buildChapterGenerationTraceSections(input: {
  contextPackage: GenerationContextPackage;
  runtimePackage: ChapterRuntimePackage;
  acceptance: ChapterAcceptanceAssessmentOutput;
}): ChapterGenerationTraceSections {
  const { contextPackage, runtimePackage, acceptance } = input;
  const meta = runtimePackage.meta;
  return {
    context: {
      gatingDecisions: contextPackage.contextGatingDecisions ?? [],
      compression: contextPackage.contextCompressionLog ?? null,
    },
    generation: {
      provider: meta?.provider ?? null,
      model: meta?.model ?? null,
      temperature: meta?.temperature ?? null,
      runId: meta?.runId ?? null,
    },
    audit: {
      overallScore: runtimePackage.audit.score?.overall ?? null,
      reports: runtimePackage.audit.reports.map((report) => ({
        auditType: report.auditType,
        overallScore: report.overallScore ?? null,
        issueCodes: (report.issues ?? []).map((issue) => issue.code),
      })),
      openIssueCodes: runtimePackage.audit.openIssues.map((issue) => issue.code),
      hasBlockingIssues: runtimePackage.audit.hasBlockingIssues,
    },
    decision: {
      acceptanceStatus: acceptance.status ?? null,
      repairability: acceptance.repairability ?? null,
      decisionReason: acceptance.decisionReason ?? null,
      failureCode: runtimePackage.failureClassification?.code ?? null,
      replanRecommended: runtimePackage.replanRecommendation?.recommended ?? null,
      replanAction: runtimePackage.replanRecommendation?.action ?? null,
      replanReason: runtimePackage.replanRecommendation?.reason ?? null,
    },
  };
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw?.trim()) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface ChapterGenerationTraceRecord {
  id: string;
  novelId: string;
  chapterId: string;
  chapterOrder: number;
  runId: string | null;
  createdAt: string;
  context: ChapterGenerationTraceSections["context"];
  generation: ChapterGenerationTraceSections["generation"];
  audit: ChapterGenerationTraceSections["audit"];
  decision: ChapterGenerationTraceSections["decision"];
}

export const chapterGenerationTraceService = {
  async record(input: {
    novelId: string;
    chapterId: string;
    chapterOrder: number;
    runId: string | null;
    contextPackage: GenerationContextPackage;
    runtimePackage: ChapterRuntimePackage;
    acceptance: ChapterAcceptanceAssessmentOutput;
  }): Promise<void> {
    const sections = buildChapterGenerationTraceSections(input);
    await prisma.chapterGenerationTrace.create({
      data: {
        novelId: input.novelId,
        chapterId: input.chapterId,
        chapterOrder: input.chapterOrder,
        runId: input.runId ?? null,
        contextJson: JSON.stringify(sections.context),
        generationJson: JSON.stringify(sections.generation),
        auditJson: JSON.stringify(sections.audit),
        decisionJson: JSON.stringify(sections.decision),
      },
    });
  },

  async list(novelId: string, chapterId: string, take = 5): Promise<ChapterGenerationTraceRecord[]> {
    const rows = await prisma.chapterGenerationTrace.findMany({
      where: { novelId, chapterId },
      orderBy: { createdAt: "desc" },
      take,
    });
    return rows.map((row) => ({
      id: row.id,
      novelId: row.novelId,
      chapterId: row.chapterId,
      chapterOrder: row.chapterOrder,
      runId: row.runId,
      createdAt: row.createdAt.toISOString(),
      context: parseJson(row.contextJson, { gatingDecisions: [], compression: null }),
      generation: parseJson(row.generationJson, { provider: null, model: null, temperature: null, runId: null }),
      audit: parseJson(row.auditJson, { overallScore: null, reports: [], openIssueCodes: [], hasBlockingIssues: false }),
      decision: parseJson(row.decisionJson, {
        acceptanceStatus: null,
        repairability: null,
        decisionReason: null,
        failureCode: null,
        replanRecommended: null,
        replanAction: null,
        replanReason: null,
      }),
    }));
  },
};
