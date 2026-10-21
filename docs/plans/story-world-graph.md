# LOOP-13 计划 · 故事世界图谱可视化(INN-C1,首轮:数据投影)

更新:2026-10-21
状态:进行中
配套:BACKLOG INN-C1(多轮项,首轮只做只读图谱数据端点与投影,React Flow 前端次轮)

## 1. 现状审计

- 世界资产已有 `WorldVisualizationPayload`(按**世界资产**:factionGraph/powerTree/geography/timeline),入口 `/worlds/:id/visualization`,**不含角色**;
- 小说侧结构化数据齐备:故事世界切片(`Novel.storyWorldSliceJson`:activeForces/activeLocations/activeElements)、`CharacterRelationStage`(当前关系阶段/下一转折)、`CharacterFactionTrack`(角色势力立场轨迹)、`Character`(name/role/factionLabel);
- **缺口**:没有按"小说"聚合的 角色×势力×地点 图谱投影,前端无法直接渲染故事世界图。

## 2. 设计(纯确定性投影,零 LLM)

1. **共享契约** `shared/types/storyWorldGraph.ts`:节点(kind: character/faction/location/element)、边(kind: character_relation/faction_membership,label/meta)、`StoryWorldGraphPayload`(nodes/edges/stats/coverage);
2. **纯函数** `services/novel/state/storyWorldGraph.ts`:`buildStoryWorldGraph({characters, relationStages, factionTracks, slice})`
   - 节点:角色(meta: role/factionLabel)、势力(切片 activeForces 与轨迹 factionLabel 按名称归一合并,切片优先)、地点、要素;
   - 边:角色-角色(仅 isCurrent 关系阶段,label=stageLabel,meta=nextTurnPoint)、角色-势力(每个角色×势力取最新轨迹一条;仅连接到已存在的势力节点);
   - 上限:节点 ≤200、边 ≤400(超出按稳定顺序截断并在 stats 标注总数);
3. **服务** `storyWorldGraphService.build(novelId)`:取角色/当前关系阶段/势力轨迹/切片 JSON(zod safeParse,损坏回退为空切片),组装 payload;
4. **只读端点** `GET /api/story-graph/:novelId`;
5. **不做**(次轮):React Flow 渲染、布局与交互、图谱内编辑动作。

## 3. 守卫测试

纯函数:切片+轨迹势力合并去重、仅已存在角色的关系边、势力成员取最新轨迹、地点/要素映射、上限截断与 stats、空数据返回空图;服务:prisma stub 查询条件与损坏切片回退;静态:路由只读+挂载+共享字段。

## 4. 验收对照

BACKLOG「世界结构数据做成可交互图谱」的首轮 = 可查询的小说级故事世界图数据;可交互渲染在次轮(可视化栈已定盘:React Flow 懒加载,不新引依赖)。

## 5. 验证

server fast 全量;client 未动沿用既往结论;wiki(workflows 或 architecture)增图谱投影契约;PROGRESS/BACKLOG(C1 标 `[/]` 首轮完成,不整项打勾);发布说明:内部端点(UI 未消费),跳过并注明。
