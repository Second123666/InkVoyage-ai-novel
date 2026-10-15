# 项目使用与操作全流程

本文面向两类读者：想把仓库在本地跑起来的开发者，以及跑起来之后想用产品写出第一本书的使用者。

- 想从源码运行 / 参与开发：从「[本地运行](#本地运行)」开始。
- 只想尽快用产品写书：可以跳过第一部分，安装方式见 [安装与准备](../public/installation.md)，然后直接看「[产品使用流程](#产品使用流程)」。

## 本地运行

### 环境要求

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0`（推荐 20.19.x LTS；低于 20.19 会在 Prisma 7 安装阶段失败）
- pnpm `>= 10.6`（仓库声明 `pnpm@10.6.0`）
- 可选：Qdrant（仅知识库 / RAG 需要）；一组 LLM API Key（也可以先启动，再在页面里配置）

### 1. 安装依赖

```bash
pnpm install
```

默认只准备 Web / Server 开发所需依赖，不会下载 Electron 桌面运行时。只有运行桌面端命令时才会补拉；想提前完成可以执行 `pnpm run prepare:desktop-runtime`（需要能访问 Electron 分发源的网络）。

### 2. 配置环境变量

环境变量按子包读取，根目录 `.env.example` 只作总览参考：

- `server/` 读取 `server/.env`（从示例复制）
- `client/` 读取 `client/.env` / `client/.env.local`，**通常不需要创建**——开发模式下前端默认把 API 指向 `http(s)://当前页面 hostname:3000/api`（同机、局域网访问都适用）

```bash
# macOS / Linux
cp server/.env.example server/.env

# Windows PowerShell
Copy-Item server/.env.example server/.env
```

最小配置关注三项：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 不设置时使用本地 SQLite | 需要 PostgreSQL 时改为连接串 |
| `RAG_ENABLED` | `true` | 暂不接知识库时设为 `false`，可跳过 Qdrant |
| `QDRANT_URL` / `QDRANT_API_KEY` | 本地 `http://127.0.0.1:6333` | 仅启用 RAG 时需要 |

`OPENAI_API_KEY`、`DEEPSEEK_API_KEY` 等模型密钥可以先留空，启动后在页面里配置；环境变量只作为启动默认值和回退值。

### 3. 启动开发环境

```bash
pnpm dev
```

这条命令依次做三件事：

1. `scripts/check-deps.cjs` 检查各子包依赖是否装齐，缺失时直接提示执行 `pnpm install`；
2. 并行启动三个进程：`shared`（TypeScript watch 编译）、`server`（ts-node-dev，端口 3000）、`client`（Vite，端口 5173）；
3. 服务端首次启动会自动执行 Prisma generate 和 `db push`（之后 schema 变化时同样自动触发），**不需要手动 migrate**。

默认地址：

| 服务 | 地址 |
| --- | --- |
| 前端 | http://localhost:5173 |
| 后端 | http://localhost:3000 |
| API | http://localhost:3000/api |

启动后建议先打开 `http://localhost:5173/settings` 配置一组可用的模型供应商，再进入 [产品使用流程](#产品使用流程)。

### 4. 可选：桌面端开发

```bash
pnpm dev:desktop
```

会等待 3000 和 5173 两个端口就绪后再启动 Electron 桌面壳；首次运行会自动补拉 Electron 运行时。

### 5. 常用命令

```bash
pnpm build            # shared → server → client 生产构建
pnpm typecheck        # 全仓类型检查
pnpm lint             # 各包 lint（当前等于 tsc --noEmit）
pnpm test             # 后端快速测试
pnpm test:all         # 后端快速 + 集成 + 客户端测试
pnpm db:migrate       # 仅在修改 Prisma schema / 走正式迁移时使用
pnpm db:seed          # 可选种子数据
pnpm db:studio        # Prisma Studio
pnpm dev:site         # 公开介绍站（端口 4173）
```

桌面打包入口（更完整的发布流程见根 [README](../../README.md) 与 [desktop/](../../desktop/)）：

```bash
pnpm stage:desktop            # 构建并暂存桌面产物
pnpm dist:desktop:nsis        # 生成 Windows 安装包
pnpm dist:desktop:portable    # 生成免安装 portable 包
```

## 产品使用流程

### 首次配置

1. 打开「系统设置」（`/settings`），填写模型供应商、API Key、Base URL 和默认模型，用连接测试确认可返回结果。首次进入且没有可用模型时，产品会先引导完成快捷配置（选一个厂商，自动检测普通文本与结构化输出）。
2. 打开「模型路由」（`/settings/model-routes`），给规划、正文、审阅、拆书等任务分配不同模型（可选，先用默认模型跑通也可以）。
3. 需要知识库 / RAG 时，到「知识库 → 向量设置」（`/knowledge?tab=settings`）配置 Embedding provider 与集合。

### 开书：三种起点

| 起点 | 适合情况 | 入口 |
| --- | --- | --- |
| 一句灵感或灵感卡 | 想从自己的点子出发 | 新手上路 / 创作中枢 |
| 热门题材信号 | 想参考当前公开榜单 | 热门题材雷达 |
| 完成的拆书 | 想续写原作或参考结构、节奏和写法 | 拆书 |

三种起点进入自动导演后共用同一套规划与章节链。

### 自动导演主流程

完整的逐步说明（含截图、产物保存位置与每步该看哪里）见 [第一本小说实操路径](../public/playbook/first-novel-walkthrough.md)。压缩版：

| 步骤 | 你的动作 / 系统行为 | 停下来先看 |
| --- | --- | --- |
| 1 | 配置模型 | 系统设置 |
| 2 | 输入灵感或选择灵感卡（「灵感对齐」） | 任务中心 |
| 3 | 系统生成候选方向批次；不满意可生成下一批或让 AI 修订 | 方向选择页 |
| 4 | 确认方案和标题组（「使用这个」/ 只重做标题 / 换一批） | 方向选择页 |
| 5 | 系统创建小说，AI 驾驶舱开始自动推进 | 小说列表、AI 驾驶舱 |
| 6 | 自动生成故事宏观、书契约 | 导演跟进 |
| 7 | 自动准备本书世界与角色候选 | 角色准备页 |
| 8 | 自动应用角色阵容，写入正式资产 | 角色库、导演跟进 |
| 9 | 自动生成卷战略、卷骨架、节奏板、章节清单与章节细化 | AI 驾驶舱、任务中心 |
| 10 | 「章节批次就绪」后选择生产方式：简易创作（只读章节书架，AI 继续完成整本书）/ 专业创作（完整工作台） | 创作向导 |
| 11 | 系统按章生成正文 → 审核 → 修复 → 记录质量债务 → 回灌状态 → 下一章 | 章节页、任务中心 |

### 什么时候需要你介入

| 情况 | 要不要介入 | 推荐动作 |
| --- | --- | --- |
| AI 驾驶舱显示「AI 正在处理」 | 不需要 | 可以留在页面观察，也可以后台继续 |
| 页面停在角色页，但顶部在生成卷战略 | 不需要 | 以顶部任务状态为准，不要重复点生成 |
| 「等待方向选择」/「等待角色确认」 | 需要 | 选择、修订、合并或重做候选 |
| 模型不可用、额度耗尽、服务异常 | 需要 | 运行记录确认原因，修复后在当前页面恢复 |
| 系统要求重新规划 | 需要 | 到导演跟进查看原因，再决定重规划或继续 |
| 章节正文可用但有质量债务 | 通常不需要立即停 | 先继续产出，之后集中处理质量债务 |
| 想退出导演模式改手动 | 需要 | 先确认后台任务已停止或完成 |

### 章节生产与质量修复

- 章节执行工作台：左侧章节卡片、中间正文与版本、右侧执行计划 / 写作 / 审核 / 修复 / 状态同步动作面板。
- 质量修复工作台：围绕当前章节执行审核、修复、生成钩子，结合批次与质量阈值批量处理。
- 正文修改页：章节写出正文后做局部精修，任务单与审计结果继续挂在这章上。
- 任务中心：查看拆书、知识库重建、整本生产等后台任务的排队、执行与失败状态。

### 资产沉淀与衍生工坊

- 拆书结果、知识库文档、写法资产、本书世界、角色资源账本会通过 RAG 回灌到规划、续写和正文生成。
- 漫画工作台与短剧工作台围绕已完成的小说内容做视觉与剧本延展，**建议在小说主链跑通后再打开**。

### 导出与备份

- 完成的章节可从导出入口导出。
- 桌面版数据（数据库、日志、素材）保存在应用数据目录；重要项目建议定期备份数据库文件与导出文件，详见 [故障排查](../public/troubleshooting.md)。

## 卡住时从哪里开始

| 症状 | 先看 |
| --- | --- |
| 模型不通、章节失败、知识库不命中 | [常见问题](../public/faq.md) |
| 需要定位日志、任务状态、数据备份 | [故障排查](../public/troubleshooting.md) |
| 自动导演 / 章节执行中途卡住，要恢复 | [按阶段恢复手册](../public/playbook/recovery-by-phase.md) |

## 相关文档

- [安装与准备](../public/installation.md)：桌面版安装与模型、存储准备
- [第一本小说实操路径](../public/playbook/first-novel-walkthrough.md)：从空项目到章节批次完成的完整操作手册
- [端到端生产链总览](../public/flow/end-to-end-production.md)、[自动导演阶段全景](../public/flow/auto-director-pipeline.md)、[章节执行链](../public/flow/chapter-execution.md)：机制深度文档
- [后端测试基础设施](./testing.md)：测试运行方式与目录约定
- [docs 管理约定](../README.md)：文档分区规则
