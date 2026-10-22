import { Router } from "express";
import { z } from "zod";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { validate } from "../middleware/validate";
import { productionTokenBudgetService } from "../services/llm/ProductionTokenBudgetService";
import { productionTokenBudgetSettingsService } from "../services/settings/ProductionTokenBudgetSettingsService";

// INN-D1 按书 token 预算:读取累计用量与预算,保存/清除本书预算。
// 成本报告端点保持只读,写操作集中在此路由。
export const productionBudgetRouter = Router();

const novelIdParamsSchema = z.object({
  novelId: z.string().trim().min(1),
});

const productionTokenBudgetSchema = z.object({
  budgetTokens: z.number().int().positive().nullable(),
});

productionBudgetRouter.get(
  "/:novelId",
  validate({ params: novelIdParamsSchema }),
  async (req, res, next) => {
    try {
      const data = await productionTokenBudgetService.getStatus(String(req.params.novelId));
      res.status(200).json({
        success: true,
        data,
        message: "Production token budget loaded.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);

productionBudgetRouter.put(
  "/:novelId",
  validate({ params: novelIdParamsSchema, body: productionTokenBudgetSchema }),
  async (req, res, next) => {
    try {
      const { budgetTokens } = req.body as z.infer<typeof productionTokenBudgetSchema>;
      const novelId = String(req.params.novelId);
      await productionTokenBudgetSettingsService.saveNovelBudget(novelId, budgetTokens);
      const data = await productionTokenBudgetService.getStatus(novelId);
      res.status(200).json({
        success: true,
        data,
        message: "Production token budget saved.",
      } satisfies ApiResponse<typeof data>);
    } catch (error) {
      next(error);
    }
  },
);
