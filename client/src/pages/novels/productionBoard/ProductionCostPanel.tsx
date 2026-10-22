import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getNovelCostReport, getProductionTokenBudget, saveProductionTokenBudget } from "@/api/costReport";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { formatCostAmount, formatTokenCount, resolveTaskTypeLabel } from "./productionCostFormat";

// INN-D1 成本与预算面板:近 30 天按任务类型的费用对比 + 本书累计用量与预算。
const COST_WINDOW_DAYS = 30;

export default function ProductionCostPanel({ novelId }: { novelId: string }) {
  const queryClient = useQueryClient();
  const costQuery = useQuery({
    queryKey: queryKeys.novels.costReport(novelId, COST_WINDOW_DAYS),
    queryFn: () => getNovelCostReport(novelId, COST_WINDOW_DAYS),
    enabled: Boolean(novelId),
  });
  const budgetQuery = useQuery({
    queryKey: queryKeys.novels.productionBudget(novelId),
    queryFn: () => getProductionTokenBudget(novelId),
    enabled: Boolean(novelId),
  });
  const status = budgetQuery.data?.data ?? null;
  const report = costQuery.data?.data ?? null;
  const [budgetInput, setBudgetInput] = useState("");

  useEffect(() => {
    setBudgetInput(status?.budgetTokens ? String(status.budgetTokens) : "");
  }, [status?.budgetTokens]);

  const saveMutation = useMutation({
    mutationFn: (budgetTokens: number | null) => saveProductionTokenBudget(novelId, budgetTokens),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.productionBudget(novelId) });
      toast.success("AI 预算已保存。");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "AI 预算保存失败，请重试。");
    },
  });

  const parsedBudget = useMemo(() => {
    const trimmed = budgetInput.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
  }, [budgetInput]);
  const budgetInputInvalid = typeof parsedBudget === "number" && Number.isNaN(parsedBudget);
  const topRows = report?.rows.slice(0, 5) ?? [];
  const hasPricedCost = typeof report?.totals.actualCost === "number";

  return (
    <section className="rounded-xl bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-foreground">AI 成本与预算</div>
          <div className="text-xs text-muted-foreground">近 {COST_WINDOW_DAYS} 天的调用费用，以及这本书的累计用量与预算。</div>
        </div>
        {status?.exceeded ? <Badge variant="destructive">已达到预算</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">费用概览</div>
          {costQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">正在汇总调用记录…</div>
          ) : costQuery.isError ? (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>成本报表读取失败。</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void costQuery.refetch()}>重试</Button>
            </div>
          ) : report ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Tokens {formatTokenCount(report.totalPromptTokens + report.totalCompletionTokens)}</Badge>
                {hasPricedCost ? (
                  <>
                    <Badge variant="secondary">实际费用 {formatCostAmount(report.totals.actualCost)}</Badge>
                    <Badge variant="outline">经济方案 {formatCostAmount(report.totals.cheapestCost)}</Badge>
                    {typeof report.totals.savingsVsCheapest === "number" && report.totals.savingsVsCheapest > 0 ? (
                      <Badge variant="outline">可节省 {formatCostAmount(report.totals.savingsVsCheapest)}</Badge>
                    ) : null}
                  </>
                ) : (
                  <Badge variant="outline">费用待定价</Badge>
                )}
              </div>
              {!hasPricedCost && report.unpricedModels.length > 0 ? (
                <div className="text-xs leading-5 text-muted-foreground">
                  还没有为这些模型配置单价，费用暂时无法估算：{report.unpricedModels.slice(0, 4).join("、")}
                  {report.unpricedModels.length > 4 ? " 等" : ""}。Tokens 用量已正常记录。
                </div>
              ) : null}
              {topRows.length > 0 ? (
                <div className="space-y-1">
                  {topRows.map((row) => (
                    <div key={row.taskType} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-xs">
                      <span className="min-w-0 truncate text-foreground">{resolveTaskTypeLabel(row.taskType)}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatTokenCount(row.promptTokens + row.completionTokens)} Tokens
                        {typeof row.actualCost === "number" ? ` · ${formatCostAmount(row.actualCost)}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">近 {COST_WINDOW_DAYS} 天还没有调用记录。</div>
              )}
            </>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">本书 token 预算</div>
          {budgetQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">正在读取预算…</div>
          ) : budgetQuery.isError ? (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>预算读取失败。</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void budgetQuery.refetch()}>重试</Button>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">
                已累计使用 {formatTokenCount(status?.usedTokens)} Tokens
                {status?.budgetTokens ? ` / 预算 ${formatTokenCount(status.budgetTokens)} Tokens` : "，当前未设置预算"}
              </div>
              {status?.exceeded ? (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                  已达到本书预算，自动导演会在章节边界暂停。调整预算或清除预算后可继续。
                </div>
              ) : (
                <div className="text-xs leading-5 text-muted-foreground">
                  设置上限后，自动导演会在每章结束检查；达到上限时暂停，调整预算后可继续。
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  step={1000}
                  inputMode="numeric"
                  value={budgetInput}
                  placeholder="例如 2000000"
                  className="h-9 w-40"
                  onChange={(event) => setBudgetInput(event.target.value)}
                  aria-label="本书 token 预算"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={saveMutation.isPending || parsedBudget === null || budgetInputInvalid}
                  onClick={() => {
                    if (typeof parsedBudget === "number" && !Number.isNaN(parsedBudget)) {
                      saveMutation.mutate(parsedBudget);
                    }
                  }}
                >
                  {saveMutation.isPending ? <Loader2 className="animate-spin" /> : null}
                  保存预算
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saveMutation.isPending || !status?.budgetTokens}
                  onClick={() => saveMutation.mutate(null)}
                >
                  清除预算
                </Button>
              </div>
              {budgetInputInvalid ? (
                <div className="text-xs text-destructive">预算需要填写大于 0 的整数 token 数。</div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
