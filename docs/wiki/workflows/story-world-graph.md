# 故事世界图谱投影(Story World Graph)

## 背景

世界资产已有按世界维度的可视化数据(`WorldVisualizationPayload`:势力图/权力树/地理/时间线),但它不包含角色,也不按"当前这本小说"聚合。小说侧的结构化数据其实齐备:故事世界切片(activeForces/activeLocations/activeElements)、角色当前关系阶段(CharacterRelationStage)、角色势力轨迹(CharacterFactionTrack)、角色基础信息。缺的是把它们合成为一张故事世界图。

## 决策

先做**只读数据投影**(LOOP-13 首轮):确定性纯函数把上述结构化数据合成 `StoryWorldGraphPayload`(节点:角色/势力/地点/要素;边:角色关系/势力归属),通过只读端点暴露;React Flow 渲染留次轮(可视化栈已定盘,懒加载,不新引依赖)。

## 当前规则

1. **纯函数** `buildStoryWorldGraph` 位于 `server/src/services/novel/state/storyWorldGraph.ts`,输入为行数据,不读库;服务方法只负责取数与切片解析(zod `safeParse`,损坏 JSON 回退空切片并标记 `coverage.hasSlice=false`)。
2. **势力合并**:切片 `activeForces` 优先;`factionLabel` 名称归一(去空白小写)后与切片势力去重,未命中的轨迹势力生成 `faction:track:*` 节点;轨迹命中切片势力时,成员边连接到切片节点而不是重复建点。
3. **关系边**:仅 `isCurrent` 的关系阶段,且双方角色都存在于节点集(自环、未知角色直接跳过);`label=stageLabel`、`meta` 携带阶段摘要与下一转折。
4. **势力归属边**:同一角色×势力只取最新一条轨迹(`updatedAt` 倒序);`stanceLabel` 进 meta。
5. **上限**:节点 ≤200、边 ≤400(稳定排序截断);`stats` 同时保留截断前 `totalEdgeCount` 与 `truncated` 标记——不静默截断。
6. **端点**:`GET /api/story-graph/:novelId`(只读);渲染层接入前,前端不得自行拼接同类图谱数据。
7. **前端渲染(LOOP-14)**:独立页面 `/novels/:id/story-graph`(`StoryGraphPage`,`React.lazy` 路由级懒加载);画布 `StoryGraphCanvas` 为二次懒加载 chunk,React Flow + `@xyflow/react/dist/style.css` 只在画布 chunk 内引入(首屏零增量);布局由纯函数 `storyGraphLayout.ts` 提供确定性同心环坐标(势力 150 → 角色 320 → 地点 480 → 要素 620),节点可拖动、点击显示摘要;入口位于小说角色工作区的「关系」页签(与仅角色的关系图互补)。节点配色只使用语义 token(角色 primary / 势力 warning / 地点 info / 要素 muted)。

## 失败模式

- 图谱只有角色没有势力/地点:检查 `Novel.storyWorldSliceJson` 是否已生成且结构通过 zod 校验(`coverage.hasSlice` 为 false 时切片被整体跳过)。
- 势力重复出现:检查名称归一后是否命中切片势力;不要在前端按 label 再合并,根因在投影层。
- 关系边缺失:确认关系阶段是否 `isCurrent`、双方角色是否为空名或已删除(`character` 行缺失时边会被过滤)。
- 图节点/边比实际少:看 `stats.truncated` 与 `totalEdgeCount`;确有需要再调上限,不要把截断当数据丢失。

## 相关模块

- `server/src/services/novel/state/storyWorldGraph.ts`(投影与服务)
- `server/src/routes/storyGraph.ts`(只读端点)
- `shared/types/storyWorldGraph.ts`(payload 契约)
- `client/src/pages/novels/storyGraph/`(页面/画布/布局:StoryGraphPage、StoryGraphCanvas、storyGraphLayout)
- `client/src/api/storyGraph.ts`(客户端只读查询)
- 相关:`server/src/services/world/worldVisualization.ts`(世界维度可视化,与本图谱互补)、`docs/design/visualization-stack.md`(次轮渲染栈纪律)

## 来源文档

- LOOP-13 计划:`../../../docs/plans/story-world-graph.md`(2026-10-21)
