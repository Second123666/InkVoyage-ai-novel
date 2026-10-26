import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import {
  createNovelPayoffLedgerItem,
  updateNovelPayoffLedgerItem,
} from "@/api/novel/planning";
import { queryKeys } from "@/api/queryKeys";
import { cn } from "@/lib/utils";
import type {
  PayoffLedgerItem,
  PayoffLedgerResponse,
  StoryStateSnapshot,
} from "@ai-novel/shared/types/novel";
import CollapsibleSummary from "./CollapsibleSummary";

interface BookPayoffLedgerCardProps {
  /** 提供后启用「新增伏笔 / 标记回收」等写操作;缺省时保持只读展示。 */
  novelId?: string;
  latestStateSnapshot?: StoryStateSnapshot | null;
  payoffLedger?: PayoffLedgerResponse | null;
  loading?: boolean;
  loadError?: boolean;
  onRetryLoad?: () => void;
}

function payoffStatusLabel(status: string): string {
  switch (status) {
    case "setup":
      return "已埋设";
    case "hinted":
      return "已提示";
    case "pending_payoff":
      return "待回收";
    case "paid_off":
      return "已回收";
    case "failed":
      return "已失效";
    case "overdue":
      return "已逾期";
    default:
      return status || "未知";
  }
}

function payoffStatusVariant(status: string): "default" | "secondary" | "outline" {
  switch (status) {
    case "paid_off":
      return "default";
    case "failed":
      return "secondary";
    default:
      return "outline";
  }
}

function payoffStatusTone(status: string): string {
  if (status === "overdue") {
    return "border-warning/40 bg-warning/10 text-warning";
  }
  if (status === "paid_off") {
    return "border-success/40 bg-success/10 text-success";
  }
  if (status === "failed") {
    return "border-border/60 bg-muted/40 text-muted-foreground";
  }
  return "";
}

function formatWindow(item: PayoffLedgerItem): string {
  if (
    typeof item.targetStartChapterOrder === "number"
    && typeof item.targetEndChapterOrder === "number"
  ) {
    return `第 ${item.targetStartChapterOrder}-${item.targetEndChapterOrder} 章`;
  }
  if (typeof item.targetEndChapterOrder === "number") {
    return `最晚第 ${item.targetEndChapterOrder} 章`;
  }
  if (typeof item.targetStartChapterOrder === "number") {
    return `从第 ${item.targetStartChapterOrder} 章开始`;
  }
  return "未限定";
}

function scopeLabel(scopeType: PayoffLedgerItem["scopeType"]): string {
  if (scopeType === "book") {
    return "全书";
  }
  if (scopeType === "volume") {
    return "卷级";
  }
  return "章节";
}

function sourceSummary(item: PayoffLedgerItem): string {
  const labels = item.sourceRefs
    .map((source) => source.refLabel?.trim())
    .filter(Boolean)
    .slice(0, 3);
  return labels.length > 0 ? labels.join(" / ") : "暂无来源摘要";
}

function isTerminalStatus(status: string): boolean {
  return status === "paid_off" || status === "failed";
}

function parsePositiveOrder(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function BookPayoffLedgerCard(props: BookPayoffLedgerCardProps) {
  const { novelId, latestStateSnapshot, payoffLedger, loading, loadError, onRetryLoad } = props;
  const queryClient = useQueryClient();
  const ledgerItems = payoffLedger?.items ?? [];
  const ledgerSummary = payoffLedger?.summary;
  const snapshotForeshadows = latestStateSnapshot?.foreshadowStates ?? [];
  const pendingForeshadows = snapshotForeshadows.filter(
    (item) => item.status !== "paid_off" && item.status !== "failed",
  );
  const paidOffForeshadows = snapshotForeshadows.filter((item) => item.status === "paid_off");
  const failedForeshadows = snapshotForeshadows.filter((item) => item.status === "failed");
  const hasCanonicalLedgerContent = ledgerItems.length > 0;
  const hasSnapshotContent = snapshotForeshadows.length > 0 || Boolean(latestStateSnapshot?.summary?.trim());

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");
  const [draftStartOrder, setDraftStartOrder] = useState("");
  const [draftEndOrder, setDraftEndOrder] = useState("");

  const invalidateLedger = () => {
    if (!novelId) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: ["novels", "payoff-ledger", novelId],
    });
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const startOrder = parsePositiveOrder(draftStartOrder);
      const endOrder = parsePositiveOrder(draftEndOrder);
      return createNovelPayoffLedgerItem(novelId as string, {
        title: draftTitle.trim(),
        summary: draftSummary.trim(),
        targetStartChapterOrder: startOrder,
        targetEndChapterOrder: endOrder,
      });
    },
    onSuccess: () => {
      toast.success("伏笔已登记。");
      setCreateFormOpen(false);
      setDraftTitle("");
      setDraftSummary("");
      setDraftStartOrder("");
      setDraftEndOrder("");
      invalidateLedger();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "登记失败，请重试。"),
  });

  const updateMutation = useMutation({
    mutationFn: (input: { itemId: string; currentStatus: "paid_off" | "failed" | "pending_payoff"; manualLocked: boolean }) =>
      updateNovelPayoffLedgerItem(novelId as string, input.itemId, {
        currentStatus: input.currentStatus,
        manualLocked: input.manualLocked,
      }),
    onSuccess: (_data, input) => {
      toast.success(
        input.currentStatus === "paid_off"
          ? "已标记为已回收。"
          : input.currentStatus === "failed"
            ? "已标记为放弃。"
            : "已重新打开跟踪。",
      );
      invalidateLedger();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "更新失败，请重试。"),
  });

  const canSubmitCreate = draftTitle.trim().length > 0
    && draftSummary.trim().length > 0
    && !createMutation.isPending;

  const renderLedgerEmpty = () => {
    if (loading) {
      return (
        <div className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
          正在同步伏笔账本，稍候即可…
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
          <span>伏笔账本读取失败，可能是首次同步没有完成。</span>
          {onRetryLoad ? (
            <Button type="button" variant="outline" size="sm" className="h-7 shrink-0" onClick={onRetryLoad}>
              重试
            </Button>
          ) : null}
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
        当前还没有伏笔记录。系统会在规划和章节生成后自动整理,你也可以点击「新增伏笔」手动登记。
      </div>
    );
  };

  const renderActions = (item: PayoffLedgerItem) => {
    if (!novelId) {
      return null;
    }
    if (isTerminalStatus(item.currentStatus)) {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate({
            itemId: item.id,
            currentStatus: "pending_payoff",
            manualLocked: false,
          })}
        >
          重新打开
        </Button>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate({
            itemId: item.id,
            currentStatus: "paid_off",
            manualLocked: true,
          })}
        >
          标记已回收
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          disabled={updateMutation.isPending}
          onClick={() => updateMutation.mutate({
            itemId: item.id,
            currentStatus: "failed",
            manualLocked: true,
          })}
        >
          标记放弃
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-0">
        <details className="group">
          <summary className="cursor-pointer list-none p-5">
            <CollapsibleSummary
              title="全书伏笔账本"
              description="整本书级别的伏笔台账,不跟随当前卷切换。可以手动登记伏笔、标记回收;AI 规划和章节生成会优先参考这里。"
              collapsedLabel="展开全书账本"
              expandedLabel="收起全书账本"
              meta={(
                <>
                  <Badge variant="outline">待兑现 {ledgerSummary?.pendingCount ?? 0}</Badge>
                  <Badge variant={ledgerSummary?.urgentCount ? "secondary" : "outline"}>
                    紧急 {ledgerSummary?.urgentCount ?? 0}
                  </Badge>
                  <Badge variant={ledgerSummary?.overdueCount ? "secondary" : "outline"}>
                    逾期 {ledgerSummary?.overdueCount ?? 0}
                  </Badge>
                  <Badge variant="outline">已回收 {ledgerSummary?.paidOffCount ?? 0}</Badge>
                </>
              )}
            />
          </summary>

          <div className="space-y-3 border-t border-border/70 px-5 pb-5 pt-4">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-foreground">伏笔台账</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ledgerItems.length}</Badge>
                  {novelId ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7"
                      onClick={() => setCreateFormOpen((open) => !open)}
                    >
                      {createFormOpen ? "收起表单" : "新增伏笔"}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                后续规划、写作、审查和修复优先消费这里的台账结果;手动标记过的条目会保持你的结论,不会被 AI 对账覆盖。
              </div>

              {createFormOpen && novelId ? (
                <div className="mt-3 space-y-2 rounded-lg border border-border/70 bg-background p-3">
                  <label className="block space-y-1 text-xs text-muted-foreground">
                    <span>伏笔标题</span>
                    <Input
                      value={draftTitle}
                      maxLength={120}
                      placeholder="例如:铜钥匙与库房后门"
                      onChange={(event) => setDraftTitle(event.target.value)}
                    />
                  </label>
                  <label className="block space-y-1 text-xs text-muted-foreground">
                    <span>简要说明</span>
                    <Input
                      value={draftSummary}
                      maxLength={2000}
                      placeholder="这条伏笔承诺了什么、大概在哪里兑现"
                      onChange={(event) => setDraftSummary(event.target.value)}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1 text-xs text-muted-foreground">
                      <span>目标起始章(可选)</span>
                      <Input
                        value={draftStartOrder}
                        inputMode="numeric"
                        placeholder="例如:12"
                        onChange={(event) => setDraftStartOrder(event.target.value)}
                      />
                    </label>
                    <label className="block space-y-1 text-xs text-muted-foreground">
                      <span>最晚回收章(可选)</span>
                      <Input
                        value={draftEndOrder}
                        inputMode="numeric"
                        placeholder="例如:30"
                        onChange={(event) => setDraftEndOrder(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => setCreateFormOpen(false)}
                    >
                      取消
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7"
                      disabled={!canSubmitCreate}
                      onClick={() => createMutation.mutate()}
                    >
                      {createMutation.isPending ? "登记中…" : "登记"}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 space-y-2 text-sm">
                {hasCanonicalLedgerContent ? (
                  ledgerItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/70 bg-background p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-foreground">{item.title}</div>
                        <Badge
                          variant={payoffStatusVariant(item.currentStatus)}
                          className={cn(payoffStatusTone(item.currentStatus))}
                        >
                          {payoffStatusLabel(item.currentStatus)}
                        </Badge>
                        <Badge variant="outline">{scopeLabel(item.scopeType)}</Badge>
                        <Badge variant="outline">{formatWindow(item)}</Badge>
                        {item.manualLocked ? (
                          <Badge variant="secondary">手动</Badge>
                        ) : null}
                        {renderActions(item)}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{item.summary}</div>
                      <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                        <div>
                          最近触碰：
                          {typeof item.lastTouchedChapterOrder === "number"
                            ? `第 ${item.lastTouchedChapterOrder} 章`
                            : "暂无"}
                        </div>
                        <div>来源摘要：{sourceSummary(item)}</div>
                        <div>
                          风险信号：
                          {item.riskSignals.length > 0
                            ? ` ${item.riskSignals
                              .slice(0, 2)
                              .map((signal) => signal.summary)
                              .join("；")}`
                            : " 暂无"}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  renderLedgerEmpty()
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-foreground">全书最新状态快照</div>
                <Badge variant="outline">{snapshotForeshadows.length}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                参考快照,以伏笔台账为准;这里用来辅助判断整体回收压力。
              </div>
              {latestStateSnapshot?.summary ? (
                <div className="mt-3 rounded-lg border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                  {latestStateSnapshot.summary}
                </div>
              ) : null}
              <div className="mt-3 space-y-3 text-sm">
                {hasSnapshotContent ? (
                  <>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">待跟进</div>
                      {pendingForeshadows.length > 0 ? (
                        pendingForeshadows.slice(0, 5).map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-border/70 bg-background p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium text-foreground">{item.title}</div>
                              <Badge variant={payoffStatusVariant(item.status)}>
                                {payoffStatusLabel(item.status)}
                              </Badge>
                            </div>
                            {item.summary ? (
                              <div className="mt-1 text-xs text-muted-foreground">{item.summary}</div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
                          当前没有待跟进的伏笔状态。
                        </div>
                      )}
                      {pendingForeshadows.length > 5 ? (
                        <div className="text-xs text-muted-foreground">
                          还有 {pendingForeshadows.length - 5} 条待跟进状态未展开。
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-background p-3">
                        <div className="text-xs text-muted-foreground">已回收</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {paidOffForeshadows.length}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-background p-3">
                        <div className="text-xs text-muted-foreground">已失效</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {failedForeshadows.length}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs text-muted-foreground">
                    还没有可用的伏笔状态快照。先执行章节生成或审计后,这里的状态会逐步充实。
                  </div>
                )}
              </div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
