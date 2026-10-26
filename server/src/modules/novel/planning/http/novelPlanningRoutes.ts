import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import type { NovelApplicationServices } from "../../../../services/novel/application/NovelApplicationContracts";

interface RegisterNovelPlanningRoutesInput {
  router: Router;
  novelService: Pick<NovelApplicationServices,
    | "getNovelState"
    | "getLatestStateSnapshot"
    | "getChapterStateSnapshot"
    | "rebuildNovelState"
    | "generateBookPlan"
    | "generateArcPlan"
    | "generateChapterPlan"
    | "getChapterPlan"
    | "replanNovel"
    | "getPayoffLedger"
    | "createManualPayoffLedgerItem"
    | "updateManualPayoffLedgerItem"
    | "syncPayoffLedger"
  >;
  idParamsSchema: z.ZodType<{ id: string }>;
  chapterParamsSchema: z.ZodType<{ id: string; chapterId: string }>;
  arcPlanParamsSchema: z.ZodType<{ id: string; arcId: string }>;
  llmGenerateSchema: z.ZodTypeAny;
  replanSchema: z.ZodTypeAny;
}

export function registerNovelPlanningRoutes(input: RegisterNovelPlanningRoutesInput): void {
  const {
    router,
    novelService,
    idParamsSchema,
    chapterParamsSchema,
    arcPlanParamsSchema,
    llmGenerateSchema,
    replanSchema,
  } = input;
  const payoffLedgerQuerySchema = z.object({
    chapterOrder: z.coerce.number().int().positive().optional(),
  });
  const createPayoffLedgerItemSchema = z.object({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(2000),
    scopeType: z.enum(["book", "volume", "chapter"]).optional(),
    targetStartChapterOrder: z.number().int().positive().nullable().optional(),
    targetEndChapterOrder: z.number().int().positive().nullable().optional(),
  }).refine(
    (value) => value.targetStartChapterOrder == null
      || value.targetEndChapterOrder == null
      || value.targetStartChapterOrder <= value.targetEndChapterOrder,
    { message: "目标窗口的起始章不能晚于结束章。", path: ["targetEndChapterOrder"] },
  );
  const updatePayoffLedgerItemParamsSchema = z.object({
    id: z.string().min(1),
    itemId: z.string().min(1),
  });
  const updatePayoffLedgerItemSchema = z.object({
    currentStatus: z.enum(["paid_off", "failed", "pending_payoff"]).optional(),
    statusReason: z.string().trim().max(500).nullable().optional(),
    manualLocked: z.boolean().optional(),
    targetStartChapterOrder: z.number().int().positive().nullable().optional(),
    targetEndChapterOrder: z.number().int().positive().nullable().optional(),
  }).refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    { message: "至少提供一个可更新字段。" },
  );

  router.get("/:id/state", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await novelService.getNovelState(id);
      res.status(200).json({
        success: true,
        data,
        message: "Story state loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/state-snapshots/latest", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id } = req.params as z.infer<typeof idParamsSchema>;
      const data = await novelService.getLatestStateSnapshot(id);
      res.status(200).json({
        success: true,
        data,
        message: "Latest state snapshot loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/:id/payoff-ledger",
    validate({ params: idParamsSchema, query: payoffLedgerQuerySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { chapterOrder } = req.query as z.infer<typeof payoffLedgerQuerySchema>;
        const data = await novelService.getPayoffLedger(id, chapterOrder);
        res.status(200).json({
          success: true,
          data,
          message: "Payoff ledger loaded.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/payoff-ledger",
    validate({ params: idParamsSchema, body: createPayoffLedgerItemSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.createManualPayoffLedgerItem(id, req.body);
        res.status(201).json({
          success: true,
          data,
          message: "伏笔已登记。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  // INN-A1b A1-G18:用户手动触发伏笔账本全量对账(同步状态过期或想立即整理时使用)。
  router.post(
    "/:id/payoff-ledger/sync",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.syncPayoffLedger(id);
        res.status(200).json({
          success: true,
          data,
          message: "伏笔账本已重新同步。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/:id/payoff-ledger/:itemId",
    validate({ params: updatePayoffLedgerItemParamsSchema, body: updatePayoffLedgerItemSchema }),
    async (req, res, next) => {
      try {
        const { id, itemId } = req.params as z.infer<typeof updatePayoffLedgerItemParamsSchema>;
        const data = await novelService.updateManualPayoffLedgerItem(id, itemId, req.body);
        res.status(200).json({
          success: true,
          data,
          message: "伏笔已更新。",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/chapters/:chapterId/state-snapshot",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.getChapterStateSnapshot(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: "Chapter state snapshot loaded.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/state/rebuild",
    validate({ params: idParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.rebuildNovelState(id, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "Story state rebuild completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/plans/book/generate",
    validate({ params: idParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.generateBookPlan(id, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "Book plan generated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/plans/arcs/:arcId/generate",
    validate({ params: arcPlanParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id, arcId } = req.params as z.infer<typeof arcPlanParamsSchema>;
        const data = await novelService.generateArcPlan(id, arcId, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "Arc plan generated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/chapters/:chapterId/plan/generate",
    validate({ params: chapterParamsSchema, body: llmGenerateSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.generateChapterPlan(
          id,
          chapterId,
          req.body as any,
        );
        res.status(200).json({
          success: true,
          data,
          message: "Chapter plan generated.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/chapters/:chapterId/plan",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;
        const data = await novelService.getChapterPlan(id, chapterId);
        res.status(200).json({
          success: true,
          data,
          message: "Chapter plan loaded.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/replan",
    validate({ params: idParamsSchema, body: replanSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const data = await novelService.replanNovel(id, req.body as any);
        res.status(200).json({
          success: true,
          data,
          message: "Replan completed.",
        } satisfies ApiResponse<typeof data>);
      } catch (error) {
        next(error);
      }
    },
  );
}
