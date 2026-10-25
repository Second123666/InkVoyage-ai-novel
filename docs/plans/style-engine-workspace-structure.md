# LOOP-37 计划 · `/style-engine` 结构终态(资产库 + 常驻编辑工作区)

更新:2026-10-25
状态:进行中
配套:BACKLOG UI-1 第三批唯一剩余项 · `docs/plans/product-ui-design-rollout-plan.md`

## 1. 现状审计

`WritingFormulaPage`(686 行)已具备资产库(`WritingFormulaLanding` 展示写法列表)与三套工作面板组件(`WritingFormulaAdvancedWorkspace` / `WorkbenchPanel` / `CleanPanel`),但三套工作面板**都通过 88vh/84vh 全屏 Dialog 打开**:

- 编辑当前写法 → `Dialog(88vh)`
- 应用与测试 → `Dialog(84vh)`
- 去 AI 味 → `Dialog(84vh)`

问题:编辑态是页面的核心动作,却以"弹窗"形式呈现,关闭即丢失工作上下文;与 rollout 目标「常驻资产库 + 编辑工作区」不符;rollout 原话即"清理超大弹窗"。

## 2. 设计(结构重构,行为不变)

1. 保留 `activeWorkspaceDialog`(null | editor | workbench | clean)状态机与 `openWorkspaceDialog`,不改任何数据流、mutation、focus hook;
2. 把三处 `<Dialog>` 容器替换为**页面内单个常驻工作区面板**:标题 + 描述 + 视图切换(editor/workbench/clean)+ 关闭按钮 + 对应面板组件;
3. 编辑面板仍挂 `editorDialogRef` 并复用 `useWritingFormulaDialogFocus`(ref 指向内联容器,焦点查询 `data-*` 不变);
4. 创建流程(`WritingFormulaCreateDialog`)保持弹窗 —— 创建是合法的模态动作;
5. 每个视图的标题/描述从原 `DialogHeader` 原样迁移,不改文案。

## 3. 拆分原则

- 只改容器(Dialog → inline section),面板组件 props、状态、mutation 全部不动;
- 不改路由、不改焦点契约(data-writing-formula-* 选择器不变);
- 关闭工作区 = 把 `activeWorkspaceDialog` 置 null,与原弹窗 onOpenChange(false) 等价。

## 4. 验证

- client typecheck;
- 守卫 `styleEngineWorkspaceStructure.test.js`:页面不再含三处超大 Dialog(h-[88vh]/h-[84vh]);存在常驻工作区 section;三面板仍在;创建弹窗保留;focus ref 挂载。
- 全量 client 测试。

## 5. 验收对照

rollout「不再把编辑工作区塞进超大弹窗 / 清理超大弹窗」= 编辑/应用/净稿三态在页面内常驻切换,弹窗只剩创建流程。

## 6. 后续

UI-1 第三批全部完成 → 可勾 UI-1 或转第四批/第五批/第六批与 UI-5。
