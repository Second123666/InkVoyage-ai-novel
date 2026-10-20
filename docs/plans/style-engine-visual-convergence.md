# LOOP-6 计划 · 写法引擎视觉收敛(UI-1 第三批 A)

更新:2026-10-20
状态:进行中
配套:BACKLOG UI-1 · rollout 计划第三批(写法引擎色值清理与弹窗收敛)

## 1. 背景与范围界定

rollout 计划显示第一/二批已于 2026-07-14 完成(本次审计复核:语义 token `success/warning/info` 已存在、`components/assetLibrary/` 共享组件已被知识库/题材/基础角色三页引用)—— BACKLOG 的 UI-1 旧描述(第一批待做)**已过时,需改口径**。

第三批真实热点(审计结论):
- 世界三页:硬编码色仅 1 处(结构类工作留后续轮);
- 反 AI 规则:0 处色值(已干净);
- 设置:17 处(小项,留后续轮);
- **写法引擎:`writingFormula` 模块 ~300 处硬编码色值 + `index.css` 中 40 行 `.writing-formula-theme` 暗色 hack + 4 处装饰渐变 + 超大创建弹窗** —— 本轮主体。

本轮只做视觉合同收敛,**不改任何业务逻辑、API、路由、文案结构**。

## 2. 色值 → 语义 token 映射表

| 旧值 | 新值 |
|---|---|
| `text-slate-950/900/800/700` | `text-foreground` |
| `text-slate-600/500` | `text-muted-foreground` |
| `text-slate-400` / `text-slate-300` | `text-muted-foreground/80` / `/70` |
| `bg-white` | `bg-background` |
| `bg-white/10`(反色徽标) | `bg-background/15` |
| `text-white`(均与 `bg-slate-950` 配对) | `text-background` |
| `bg-slate-950`(选中/主视觉反色块) | `bg-foreground` |
| `bg-slate-50` 及 `/40–/80` 变体 | `bg-muted/40` |
| `bg-slate-100` 及 `/80` | `bg-muted` |
| `border-slate-950`(选中强调) | `border-foreground/70` |
| `border-slate-200` 及 `/80` | `border-border/70`(变体 `/60`) |
| `border-slate-100/300/400` | `border-border/60` / `border-border` / `border-border` |
| `sky-*`(信息色) | `info` token:`bg-info/10`、`bg-info/15`、`border-info/40`、`text-info` |
| `amber-*`(警示色) | `warning` token:`bg-warning/10`、`bg-warning/15`、`border-warning/40`、`text-warning` |
| `emerald-*`(成功色) | `success` token:`bg-success/10`、`border-success/40`、`text-success` |
| `rose-*`(危险色) | `destructive` token:`bg-destructive/10`、`border-destructive/40`、`text-destructive` |
| 4 处 `bg-[linear-gradient(...)]` 装饰渐变 | 平底色:`bg-background` / `bg-muted/40`(按语境) |
| `writing-formula-theme` class + `index.css` 暗色 hack 块 | 全部删除(语义 token 自带明暗适配) |

## 3. 本轮改动清单

1. `client/src/pages/writingFormula/` 11 个组件 + 页面根:按映射表机械迁移(~300 处),移除 `writing-formula-theme` class 引用;
2. `client/src/index.css`:删除 `.dark .writing-formula-theme [...]` 整块(约 40 行,含说明注释);**不动** `prompt-workbench-theme` 块(另一模块);
3. `WritingFormulaCreateDialog` 尺寸收敛:`max-w-5xl` → `max-w-4xl`、`h-[min(780px,92vh)]` → `h-[min(720px,90vh)]`;功能型工作台弹窗(Page 内 980–1180px)保留;
4. 新增守卫测试 `client/tests/styleEngineVisualContracts.test.js`:
   - `writingFormula` 目录零调色板类(`slate|amber|emerald|sky|rose` + `bg-white` + 十六进制任意值);
   - `index.css` 不含 `writing-formula-theme`;
   - 创建弹窗不含 `max-w-5xl`。

## 4. 验收

- 上述守卫测试绿;client typecheck 通过;client 全量测试(基线 219)绿;
- 不新增任何依赖/组件/API/路由;不改业务逻辑;暗色模式由语义 token 自动适配(删除 hack 后不再依赖属性选择器;
- UI 观感验收(明暗两套、三种主题)按仓库规则留给所有者。

## 5. 风险与回退

- 机械替换风险:以"零调色板类"守卫兜底;单 commit 可整体回退;
- 暗色适配:语义 token 在明暗两套已定义(`--success/--warning/--info` 亮暗双值),删除 hack 后由 token 接管;
- 既有暗色 hack 的非等价映射(`bg-sky-50` 曾映射为 `primary/0.12`)以 `info` token 为准 —— 属设计系统对齐方向。
