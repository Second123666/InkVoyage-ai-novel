# 规划变更保存前预览(Planning Change Preview)

## 背景

小说工作区里已经存在几类"先看差异再决定"的能力:

- 章节 AI 改写:候选版本携带 `diffChunks`,正文区提供段落对比与细节标记,接受后才写回;
- 故事线 / 卷规划版本历史:`StorylineDiff`、`VolumePlanDiff` 对比两个已保存版本;
- 世界同步:`novelWorldSyncDiff` 在写回世界资产前列出差异。

但**规划落盘**本身没有确认面:卷战略页与节奏/拆章页共享同一份 `VolumePlanDocument`,点击保存会把整份草稿直接写入,并创建新的规划版本。对第一次写长篇的用户,误删章节、调整章序或改错卷信息后很难在保存前发现。

## 决策

采用**客户端确定性 diff + 保存确认弹窗**,不改后端契约:

1. 纯函数对比"已保存工作区文档"与"当前草稿";
2. 卷战略保存(`saveOutlineMutation`)与节奏拆章保存(`saveStructuredMutation`)统一经过 `requestPlanSave` 入口;
3. 有差异时先展示本次会新增、移除、移动、修改的卷与章节,确认后才调用原保存 mutation;
4. 无基线(工作区尚未加载)或无差异时直接保存,不打断用户。

## 当前规则

1. **纯函数位置**:`client/src/pages/novels/components/structuredOutline/volumeWorkspaceDiff.ts`。输入 `baseline` / `draft` 两份 `VolumePlan[]`,输出 `VolumeWorkspaceDiff`;不读库、不发请求、不调用 LLM。
2. **匹配键**:卷按 `volume.id`,章节按 `chapter.id`。分类优先级:
   - 只存在于草稿 → 新增;
   - 只存在于基线 → 移除;
   - 两边都有但卷不同或 `chapterOrder` 不同 → 移动(跨卷移动只记一次,不重复记字段修改);
   - 同卷同序但字段变化 → 修改。
3. **字段标签**:卷比较 `title/sortOrder/summary/mainPromise`;章节比较 `title/summary/purpose/exclusiveEvent/targetWordCount/conflictLevel`。标签用中文,面向用户展示。
4. **基线来源**:`NovelEdit` 中 `savedVolumeWorkspace.volumes`(卷工作区查询结果);草稿来源:`normalizedVolumeDraft`。
5. **保存门禁**:`usePlanningSavePreview`(`client/src/pages/novels/hooks/usePlanningSavePreview.ts`)提供 `requestPlanSave(target)`;`target` 为 `volume_strategy` 或 `structured_outline`。`savedVolumes.length === 0 || !diff.hasChanges` 时直接执行对应 mutation;否则打开 `VolumeWorkspaceSaveDiffDialog`。页面只负责把两个保存 mutation 注入 `onSave`。
6. **同步语义必须如实说明**:节奏拆章保存发送 `syncToChapterExecution: true`;服务端同步时 `preserveContent: true`、`applyDeletes: false` —— 已有正文保留,卷纲外章节不会被自动删除。弹窗文案必须与之一致,不能暗示"保存即删除章节"。
7. **版本语义**:两种保存都会记录新的规划版本;卷战略弹窗提示可在版本历史查看差异,节奏拆章弹窗提示同步到章节执行区。
8. **不回退既有预览**:章节 AI 改写、故事线/卷版本 diff、世界同步 diff 继续由各自模块负责;本模块只补"保存前"这一层,不复制服务端的版本 diff 逻辑。
9. **测试守护**:`client/tests/planningChangePreview.test.js` 覆盖分类、跨卷移动、无改动/空基线,以及两个保存入口必须经过预览、弹窗必须说明同步语义。

## 失败模式

- **弹窗把所有内容都标为新增**:基线为空(卷工作区查询未完成或首次使用)。此时按规则直接保存,不应把空基线误当成"全量新增"展示。
- **草稿明明改了却提示无差异**:确认 `normalizedVolumeDraft` 是否已被 AI/自动导演刷新,或改动只发生在服务端合并字段(`mergeVolumeWorkspaceInput`)而不是客户端草稿;预览只覆盖客户端将要提交的文档。
- **保存后章节执行区没有删除章节**:这是预期行为(`applyDeletes: false`),不是预览遗漏;需要删除应走章节执行区的显式操作。
- **版本历史里的 diff 与本弹窗不一致**:版本 diff 比较两个已保存版本,本弹窗比较"已保存 vs 未保存草稿",两者语义不同,不要互相替代。

## 相关模块

- `client/src/pages/novels/NovelEdit.tsx`(弹窗挂载与保存 mutation 注入)
- `client/src/pages/novels/hooks/usePlanningSavePreview.ts`(保存门禁)
- `client/src/pages/novels/components/structuredOutline/volumeWorkspaceDiff.ts`(纯 diff)
- `client/src/pages/novels/components/structuredOutline/VolumeWorkspaceSaveDiffDialog.tsx`(确认弹窗)
- `client/src/pages/novels/hooks/useNovelEditMutations.ts`(两个保存 mutation)
- `server/src/services/novel/volume/NovelVolumeService.ts`(保存、版本与章节同步语义)
- `docs/wiki/workflows/volume-planning.md`(卷规划工作流)
- `docs/plans/planning-change-preview.md`(本轮计划与验收)
