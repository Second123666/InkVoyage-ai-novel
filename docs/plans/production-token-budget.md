# LOOP-17 计划 · 全链路 token 预算与成本报表(INN-D1)

更新:2026-10-22
状态:进行中
配套:BACKLOG INN-D1

## 1. 现状审计

- 拆书已有 `BookAnalysisBudgetGuard`:按分析配置 `budgetTokens`,每个 section 结束后累加 `usedTokens` 并抛错;
- 自动导演已有固定阈值熔断:单步骤 150k / 单章 80k,属于异常保护,不是用户可配置的预算;
- LOOP-11 已交付按书成本报表(`LlmUsageEvent` 流水 + 模型价格 + `GET /api/cost-report/:novelId`),但只有 API,没有前端入口;
- **缺口**:生产链没有"这本书最多花多少 token"的可配置预算;成本报表用户不可见。

## 2. 设计

### 2.1 预算配置(server)

- `AppSetting.llm.production_token_budget`:`{ defaultTokens: number|null, novels: Record<novelId, number> }`,正整数 token;
- 解析优先级:本书覆盖 > 全局默认;非法值(0/负数/非数字)按未设置处理;
- 服务:`ProductionTokenBudgetSettingsService`(纯解析 + 存取),注入式 `appSettingStore` 便于单测;
- 预算读写端点独立挂载 `GET/PUT /api/production-budget/:novelId`;成本报告端点保持只读。

### 2.2 用量与判定(server)

- 累计用量 = `LlmUsageEvent` 按 novelId 全量求和(与成本报表同一流水,覆盖规划/写作/审核/修复等带书上下文的调用);
- `ProductionTokenBudgetService.getStatus(novelId)` 返回 `{ budgetTokens, usedTokens, exceeded }`;
- 判定为**严格大于**:用量恰好等于预算不暂停;读取失败时按未设置处理,不误停主链。

### 2.3 执行链拦截(server)

- 在 `resolveUsageCircuitBreaker`(每章结束、准备继续下一章时调用)中,先做单章异常检查,再做本书预算检查;
- 超限时 `recordTokenBudgetExceededSignal` 打开熔断:reason `token_budget_exceeded`、问题码 `runtime.token_budget_exceeded`、恢复动作 `resume_after_review`;
- 只暂停,不删除已生成内容;调整或清除预算后从源页面恢复;
- 不走 replan 分支,不把预算暂停混同为质量债务。

### 2.4 前端(生产看板)

- `ProductionCostPanel`:近 30 天费用概览(实际/经济方案/可节省、按任务类型前 5)、本书累计用量与预算输入;
- 未配置模型单价时明确提示"费用待定价",Tokens 用量照常展示;
- 超限时提示"自动导演会在章节边界暂停,调整或清除预算后可继续";
- 展示格式抽为纯函数 `productionCostFormat.ts`。

## 3. 守卫测试

- server:`productionTokenBudget.test.js` —— 解析/优先级/判定边界/按书保存保留其他书/状态聚合/熔断信号/接线契约;
- client:`productionCostPanel.test.js` —— 展示格式、面板复用报表与预算接口、超限说明、路由只读约束;
- 全量:server 1441(1429 过 / 0 失败 / 12 跳过)、client 234/234、双端 typecheck 0 错误。

## 4. 验收对照

「拆书已有 token 预算守卫,扩展到生产链」= 本书预算 + 章节边界熔断 + 可恢复;
「每本书出成本报表」= 既有报表 API + 生产看板费用概览。

## 5. 不做

- 不按 token 预算自动切换模型路由(策略化路由属后续);
- 不阻断手动单章生成(预算只在自动导演的章节边界检查);
- 不做全局预算设置页(先按书配置,默认值可通过设置 JSON 维护)。
