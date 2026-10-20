import { Router } from "express";
import { z } from "zod";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { validate } from "../middleware/validate";
import {
  modelCostReportService,
  type CostReport,
} from "../services/llm/ModelCostReportService";

// INN-B3 只读成本报告:按书聚合调用流水,给出当前路由 vs 经济/强模型路由的成本对比。
export const costReportRouter = Router();

const costReportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

costReportRouter.get(
  "/:novelId",
  validate({ query: costReportQuerySchema }),
  async (req, res, next) => {
    try {
      const { days } = req.query as z.infer<typeof costReportQuerySchema>;
      const data = await modelCostReportService.buildReport(String(req.params.novelId), days ?? 30);
      res.status(200).json({
        success: true,
        data,
        message: "Cost report loaded.",
      } satisfies ApiResponse<CostReport>);
    } catch (error) {
      next(error);
    }
  },
);
