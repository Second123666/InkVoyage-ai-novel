# LOOP-15 计划 · 生产看板(INN-C2)

更新:2026-10-21
状态:进行中
配套:BACKLOG INN-C2

## 1. 现状审计

- 小说详情接口(`GET /novels/:id`)的 Chapter 只有 chapterStatus/generationState/content/riskFlags,不含看板需要的聚合状态、字数与质量债务明细;
- 既有 `GET /novels/:id/simple-shelf` 已在服务端派生 chapters 的 8 态 status、wordCount 与 qualityDebt,并给出 openQualityDebtCount;
- 既有 `GET /novels/:id/volumes` 返回 VolumePlan(含 VolumeChapterPlan 的章序映射),可计算卷进度;
- 工作区分散展示章节进度/待修复数(项目工具弹窗),但没有一屏总览。

## 2. 设计(纯前端,复用既有投影,零新增后端契约)

1. **数据源**:`simple-shelf`(章节状态/字数/债务)+ `volumes`(章序映射);两请求独立,卷进度失败不影响其余区块;
2. **纯聚合模型** `productionBoardModel.ts`:`buildProductionBoardModel({chapters, volumes})` →
   - 状态分布(8 态固定顺序,含零项)、总字数、完成率;
   - 待处理章节(error → replan_required → quality_debt,同组按章序);
   - 质量债务热点(按 issueCodes 数降序,取前 5,带原因与修复次数);
   - 卷进度(按卷章序映射计算完成/待处理/比例,未挂卷章节计数);
3. **页面** `/novels/:id/production-board`(路由级懒加载):统计徽标 + 状态条形分布 + 待处理/债务热点双栏 + 卷进度,条目直达章节页;
4. **入口**:小说工作区「项目工具」弹窗新增「打开生产看板」;
5. **移动端合同**:路由元数据(生产看板/novels 组)+ CSS 落点 + 导航测试更新;
6. **不做**:新增后端端点/字段、看板内编辑动作、跨书对比。

## 3. 守卫测试

模型:状态零项与顺序、待处理排序、热点排序限量、卷进度比例与未挂卷计数、空数据;静态:路由懒加载与挂载、页面装配(复用 simple-shelf + volumes 投影,且不得回退到详情接口)、工作区入口、移动端元数据与 CSS。

## 4. 验收对照

「章节状态、质量债务热点、卷进度一屏总览」= 看板页三区块 + 头部统计,条目可直达处理位置。

## 5. 验证

client typecheck + 全量测试;server 未动沿用既往结论;UI 验收留所有者;发布说明新增用户可见条目;wiki 无需新增(聚合 UI,契约无新增)。PROGRESS/BACKLOG([x]+✅)。
