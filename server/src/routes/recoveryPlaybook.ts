import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type { RecoveryPlaybookCatalog } from "@ai-novel/shared/types/recoveryPlaybook";
import { listRecoveryPlaybook } from "../services/task/recoveryPlaybook";

// INN-B4 只读恢复知识库目录:结构化失败码 → 原因解释与恢复动作建议。
export const recoveryPlaybookRouter = Router();

recoveryPlaybookRouter.get("/", (_req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: listRecoveryPlaybook(),
      message: "Recovery playbook loaded.",
    } satisfies ApiResponse<RecoveryPlaybookCatalog>);
  } catch (error) {
    next(error);
  }
});
