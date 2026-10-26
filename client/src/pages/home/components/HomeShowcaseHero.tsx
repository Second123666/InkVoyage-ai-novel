import { Link } from "react-router-dom";
import { ArrowRight, Bot, BookOpenCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// UI-5 开源 Showcase(LOOP-46):新访客首屏一屏理解"这是什么、怎么开始"。
// 仅在还没有小说时展示,已有创作的用户保持行动优先的首页。
const HIGHLIGHTS = [
  {
    icon: Bot,
    title: "自动导演主链",
    description: "书级定位、故事宏观、世界与角色、卷战略、节奏拆章、章节任务依次推进。",
  },
  {
    icon: ShieldCheck,
    title: "长篇记忆与一致性",
    description: "分层记忆、伏笔账本与一致性守卫，减少后段遗忘与前后矛盾。",
  },
  {
    icon: BookOpenCheck,
    title: "从灵感到成书",
    description: "规划、正文、审校、修复与导出在同一条生产链里完成。",
  },
] as const;

export default function HomeShowcaseHero() {
  return (
    <section className="rounded-3xl border border-primary/15 bg-primary/[0.05] px-6 py-7 sm:px-8">
      <div className="max-w-3xl space-y-3">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          AI 驱动的长篇小说生产工作台
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          从一句灵感开始，写完一整本长篇
        </h1>
        <p className="text-sm leading-7 text-muted-foreground">
          输入你的想法，自动导演会依次准备书级定位、故事宏观、世界与角色、卷战略、节奏拆章与章节任务；
          只有需要你选择方案或处理异常时才会停下询问。
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild size="lg">
            <Link to="/novels/create">
              开始第一本小说
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/help">了解完整流程</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="rounded-lg bg-background/70 p-4">
            <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <div className="mt-2 text-sm font-medium text-foreground">{item.title}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
