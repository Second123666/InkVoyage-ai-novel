# LOOP-11 计划 · 成本感知模型路由(INN-B3)

更新:2026-10-20
状态:进行中
配套:BACKLOG INN-B3(验收:同一本书两种路由的成本对比可见;配合 INN-D1)

## 1. 现状审计

- `ModelRouteConfig`(taskType→provider/model/temperature/maxTokens)已实现"按任务类型可配策略";
- `usageTracking` 已在每次 LLM 调用记录 provider/model/taskType + token 用量,但只**聚合到任务行**(workflowTask/generationJob/styleExtractionTask)或导演遥测表,**没有按书、按任务的调用流水**;
- 全库无价格数据(仅 agent traceStore 的 costUsd 字段),无从计算成本。

真实缺口 = ①按书计量流水 ②模型价格配置 ③"当前路由 vs 经济/强模型路由"的成本对比。

## 2. 设计(零新 LLM 调用)

1. **`LlmUsageEvent` 表**(双 schema + 双迁移):novelId?/taskType?/provider/model/promptTokens/completionTokens/totalTokens/durationMs?/createdAt;索引 (novelId, createdAt) 与 (taskType, createdAt)。`recordTrackedLlmUsage` 中当可解析到 novelId 时 fire-and-forget 写入(失败吞掉;无书上下文不写,避免设置页测试调用污染)。
2. **价格配置**:`ModelPricingSettingsService`(仿 QualityDebtSettingsService,AppSetting key `llm.model_prices`):JSON `{ prices: { "provider::model": { inputPer1M, outputPer1M } } }`,校验非空键/非负数,store 可注入以便测试;设置端点 `GET/PUT /api/settings/model-prices`。
3. **成本报告** `ModelCostReportService`:
   - 纯函数 `estimateCost`(token×单价/1M,null 价格→unpriced)、`buildCostReport`(按 taskType 聚合:实际 token、当前路由(来自 ModelRouteConfig)、当前成本、最便宜/最贵可用模型替代成本、节省额与比例;未知价格模型列入 unpricedModels);
   - `buildReport(novelId, days=30)`:读 LlmUsageEvent(窗口内)+ ModelRouteConfig + 价格配置。
4. **查询 API**:`GET /api/cost-report/:novelId?days=30`(只读)。前端展示后置。
5. **不做**:按书覆盖路由(现状全局路由即可满足对比验收)、自动路由切换(策略化属后续)、D1 的全链路预算与报表 UI 互相引用但独立。

## 3. 守卫测试(`server/tests/modelCostReport.test.js`)

价格服务解析/校验(合法/损坏 JSON/负数)、estimateCost 数学与 unpriced、报告聚合(当前路由成本、经济/强模型替代、节省率、未定价列表、窗口过滤由纯函数入参保证)、settings 端点静态契约、usageTracking 写入钩子静态、报告路由只读静态。

## 4. 验收对照

「同一本书两种路由的成本对比可见」= 报告按 taskType 给出 当前 / 最便宜 / 最贵 三列成本与节省额,API 可查;前端展示与 D1 报表后置联动。

## 5. 验证

server fast 全量(含迁移对齐);client 未动沿用既往结论;wiki(model-selection)增成本段;PROGRESS/BACKLOG([x]+✅);发布说明:内部能力(API 无 UI),跳过并注明。
