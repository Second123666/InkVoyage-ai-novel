# LOOP-16 计划 · 规划变更保存前预览(INN-C3)

更新:2026-10-21
状态:进行中
配套:BACKLOG INN-C3

## 1. 现状审计

- 章节 AI 改写已有候选 diff(`diffChunks` + 段落对比/细节标记),接受后才落盘;
- 故事线版本与卷版本已有 `StorylineDiff` / `VolumePlanDiff` 预览,但对比的是两个已保存版本;
- 世界同步已有 `novelWorldSyncDiff`;
- **缺口**:卷战略与节奏/拆章共享的 `VolumePlanDocument` 保存时整份草稿直接写入并创建新版本,保存前看不到会新增/移除/移动/修改哪些卷与章节。

## 2. 设计(纯前端,不改后端契约)

1. **纯 diff 模型** `volumeWorkspaceDiff.ts`:按卷 id / 章节 id 匹配,分类新增、移除、移动(章序或跨卷)、字段修改;输出中文标签与确定性排序,可单测;
2. **保存门禁** `usePlanningSavePreview` hook:卷战略(`volume_strategy`)与节奏拆章(`structured_outline`)两个保存入口统一先算 diff;无基线或无改动直接保存,有改动先打开确认弹窗;页面只注入保存 mutation;
3. **确认弹窗** `VolumeWorkspaceSaveDiffDialog`:汇总徽标 + 分组列表;节奏拆章明确说明"同步到章节执行区、已有正文保留、卷纲外章节不自动删除";卷战略说明会记录新的规划版本;
4. **组件归属**:新文件放入 `components/structuredOutline/` 责任目录,避免继续膨胀 `Structured*` 平铺文件;
5. **不做**:后端 diff 端点、保存拦截后的自动修复、章节正文手动编辑的 diff(所见即所得,不需要)。

## 3. 守卫测试

模型:新增/移除/移动/修改分类、跨卷移动不重复计数、无改动、空基线;静态:两个保存入口必须经 `requestPlanSave`、弹窗必须挂载且说明同步语义、无基线/无改动时直接保存。

## 4. 验收对照

「规划/章节修改先预览 diff 再落盘」:

- 规划修改 → 卷战略/节奏拆章保存前的确认弹窗(本轮补齐);
- 章节修改 → AI 改写候选 diff(既有能力),版本历史 diff(既有能力)。

## 5. 验证

client typecheck + 全量测试;server 未动沿用既往结论;UI 验收留所有者;发布说明新增用户可见条目;wiki 新增 `workflows/planning-change-preview.md`。PROGRESS/BACKLOG([x]+✅)。
