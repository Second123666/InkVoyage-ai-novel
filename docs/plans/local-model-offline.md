# LOOP-18 计划 · 本地模型离线跑审校与摘要(INN-D2)

更新:2026-10-23
状态:进行中
配套:BACKLOG INN-D2

## 1. 现状审计

Ollama 兼容层的主体已经存在,且已有测试:

- 内置厂商 `ollama`:`requiresApiKey: false`,默认 `http://127.0.0.1:11434/v1`,环境变量 `OLLAMA_BASE_URL` / `OLLAMA_MODEL`;
- 模型目录:优先读取原生 `/api/tags`,失败回退 OpenAI 兼容 `/models`(`modelCatalog.fetchOllamaModels`);
- 请求工厂:`resolved.apiKey ?? "ollama"` 占位密钥,OpenAI 兼容客户端可直接连接本地服务;
- 结构化输出:`resolveStructuredOutputProfile` 将 Ollama 归为 `family: ollama`,固定 `prompt_json`,不发送不支持的 JSON 模式;
- 设置页:免密钥厂商可保存地址/模型;快速设置向导标注"使用本机模型,不要求 API Key";
- RAG 嵌入:候选模型包含 `nomic-embed-text` 等,嵌入服务对免密钥厂商返回空密钥。

**缺口不是协议兼容,而是最后一公里**:

1. 模型路由页只能手动"选厂商 → 选模型 → 套用到全部/异常/空白任务",没有直接表达"审核与摘要离线跑"的入口;
2. 厂商状态卡在本机厂商未配置时仍提示"配置 API Key",与本地模型的恢复方式不符。

## 2. 设计

1. **离线任务预设**(纯前端,`modelRoutes.utils.ts`):
   - `LOCAL_OFFLINE_TASK_TYPES = [review, light_review, critical_review, summary]`,只覆盖审校与摘要,不碰正文生成/修复/重规划;
   - `findLocalModelProvider`:仅选择 `provider=ollama` 且已配置、启用的厂商;
   - `buildLocalOfflineRouteDraft`:取当前模型或候选首项,温度 0.3,协议与结构化格式保持 `auto`;
   - 模型路由页「本机跑审校与摘要」按钮:把草稿填入上述四类任务,提示"确认后保存";没有可用本机模型时禁用。
2. **免密钥文案**:厂商状态卡对 `requiresApiKey === false` 的厂商改为提示启动本地服务/选择模型,不再提示配置 API Key;余额区域说明本机模型不需要余额。
3. **文档**:wiki 记录离线路径、适用边界(审校/摘要,不建议正文)、失败模式与恢复方式。
4. **不做**:Ollama 原生 `/api/chat` 协议、自动拉取模型、自动探测本机服务、自动切换路由(仍需用户确认保存)。

## 3. 守卫测试

- client `localModelOffline.test.js`:任务类型范围、本机厂商筛选、草稿字段、按钮装配与免密钥文案;
- server `ollamaOfflinePath.test.js`:免密钥就绪、默认地址、模型端点、`prompt_json` 策略、原生目录优先与工厂兜底;
- 全量:client typecheck + 测试,server 全量套件。

## 4. 验收对照

「补 Ollama 兼容层,审核/摘要可离线跑」:

- 兼容层:审计确认既有能力完整,并以守卫测试固定;
- 离线跑审核/摘要:模型路由页一键填入本机模型,保存后四类审校/摘要任务走本机。

## 5. 风险与边界

- 本机模型上下文窗口通常小于云端模型,长章生成不建议使用;预设只覆盖审校/摘要。
- `prompt_json` 依赖模型遵循 JSON 指令,失败时走既有 JSON 修复;极弱模型仍可能失败,需换模型。
- 预设只填草稿,不直接写库;用户可逐项检查后保存。
