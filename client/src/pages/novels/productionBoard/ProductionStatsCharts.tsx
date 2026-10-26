import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimpleCreationShelfChapterStatus } from "@ai-novel/shared/types/novel";
import { CHAPTER_STATUS_META } from "./productionBoardModel";

// UI-7 统计面板:Recharts 只在本懒加载 chunk 内引入,生产看板主界面保持零图表依赖。
interface ProductionStatsChartsProps {
  statusCounts: Array<{ status: SimpleCreationShelfChapterStatus; label: string; count: number }>;
  wordCountByVolume: Array<{ name: string; wordCount: number }>;
  debtIssueCounts: Array<{ code: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
  muted: "hsl(var(--muted-foreground))",
};

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

export default function ProductionStatsCharts({
  statusCounts,
  wordCountByVolume,
  debtIssueCounts,
}: ProductionStatsChartsProps) {
  const statusData = statusCounts
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.label,
      value: item.count,
      fill: STATUS_COLORS[CHAPTER_STATUS_META[item.status].tone] ?? STATUS_COLORS.muted,
    }));
  const hasWordData = wordCountByVolume.some((item) => item.wordCount > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl bg-muted/20 p-4">
        <div className="mb-3 text-sm font-medium text-foreground">章节状态占比</div>
        {statusData.length === 0 ? (
          <div className="text-xs text-muted-foreground">当前还没有可统计的章节状态。</div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-[200px] min-w-[200px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {statusData.map((item) => (
                      <Cell key={item.name} fill={item.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} 章`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {statusData.map((item) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.fill }} />
                  <span className="text-foreground">{item.name}</span>
                  <span>{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-muted/20 p-4">
        <div className="mb-3 text-sm font-medium text-foreground">各卷字数</div>
        {!hasWordData ? (
          <div className="text-xs text-muted-foreground">还没有已写正文,字数统计会在生成后出现。</div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wordCountByVolume} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${Number(value).toLocaleString("zh-CN")} 字`, "字数"]}
                />
                <Bar dataKey="wordCount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-muted/20 p-4 lg:col-span-2">
        <div className="mb-3 text-sm font-medium text-foreground">质量债务问题分布</div>
        {debtIssueCounts.length === 0 ? (
          <div className="text-xs text-muted-foreground">当前没有记录中的质量债务。</div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtIssueCounts} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="code"
                  width={150}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value} 个章节`, "命中"]}
                />
                <Bar dataKey="count" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
