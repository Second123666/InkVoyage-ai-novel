# 改进进度日志 · Progress Log

配套流程:[improvement-workflow.md](improvement-workflow.md) · 待办池:[BACKLOG.md](BACKLOG.md)
写法:**每轮一条,插入本文件顶部(最新在上)**;轮次未完成时用 `[/]` 标题占位,完成后补全。

条目格式:

```
## YYYY-MM-DD · LOOP-N · 标题
- **类别**: bugfix / 重构 / 功能收束 / 创新 / 流程
- **目标**: 这轮要解决什么
- **改动**: 动了哪些文件/模块,关键提交哈希
- **验证**: 跑了什么(命令/手工步骤)、结果如何
- **遗留**: 未尽事项(→ 已登记 BACKLOG #ID)
- **下一步**: 建议的下一轮选题
```

---

## 2026-10-28 · LOOP-67 · beta 集成验证

- **类别**: 发布准备 / 验证
- **目标**: 在 `beta` 分支完成集成验证,确认桌面身份切换版本可以进入 `main`。
- **范围确认**: `beta`(`7648c578`)= `main`(`6b117eb9`)+ 身份切换 4 个提交;相对已通过验证的 `e2f19c8f` 只多 BACKLOG/PROGRESS 各 1 行,业务代码一致。
- **改动**:
  1. **环境修复**:打包时 electron-builder 把 `better-sqlite3` 重建为 Electron 35 ABI(133),导致 Node 24(137)下 server 测试全量 `ERR_DLOPEN_FAILED`;用 `prebuild-install -r node` 恢复 Node ABI 后测试恢复;
  2. **验证记录**:新增 `docs/wiki/debugging/desktop-packaging-native-and-codesign.md`,记录 ABI 来回切换与 `winCodeSign` 符号链接权限两类故障的成因、排查步骤与本地补验方法;`docs/wiki/README.md` 补索引。
- **验证**:
  - server fast 套件 **1492 例 / 1480 过 / 0 失败 / 12 跳过**;
  - `pnpm --filter @ai-novel/desktop test` **5/5**(含构建);
  - `pnpm run typecheck`(shared / server / client / desktop)通过;
  - `pnpm run check:docs-manifest` 通过(35 篇公开文档);
  - 生产配置打包:在 `app-builder.exe rcedit` 阶段因 `winCodeSign` 内 macOS 符号链接无创建权限而中断(`toolsets.winCodeSign=1.1.0` 无效,该下载在 app-builder 内部触发);手工用缓存 `rcedit-x64.exe` 对 `win-unpacked/InkVoyage.exe` 补资源后,`ProductName=墨航 InkVoyage`、`FileDescription=墨航 InkVoyage`、`ProductVersion=0.5.0`,exe 图标与 `app-icon.ico` 32×32 帧逐像素一致(RMSE 0);
  - 复用 `e2f19c8f` 上同一份代码的既有结果:client 构建、site 构建(37 路由)、`verify-desktop-package`(带 `signAndEditExecutable=false` 覆盖)、NSIS 安装器冒烟(安装/快捷方式/启动/卸载/重装数据保留)均通过;`beta` 相对该提交未改业务代码。
- **结论**:`beta` 代码可通过验证并进入 `main`;带 exe 资源的完整打包以 GitHub Actions(管理员权限)为准,`desktop-release.yml` / `desktop-beta-release.yml` 已覆盖。
- **发布说明**:本轮为内部验证与文档,无用户可见变化,跳过 release notes。
- **遗留**:本机非管理员环境无法完成带 exe 资源编辑的完整打包,发布前以 CI 打包结果为准。
- **下一步**:`beta` 合入 `main`;桌面发布使用 `v0.5.0` 并核对 `desktop/package.json`。

## 2026-10-28 · LOOP-66 · 桌面身份与图标切换为墨航 InkVoyage

- **类别**: 开源就绪 / 桌面打包
- **背景**: 公开前剩余旧技术标识(productName/appId/exe/数据目录/更新缓存)和图标;所有者确认切换为「墨航 InkVoyage」,并接受新旧版本并排安装。
- **改动**:
  1. **身份配置**:`desktop/package.json` 升至 `0.5.0`,`productName` = `墨航 InkVoyage`,`appId` = `com.inkvoyage.desktop`,新增 `inkvoyage.*` 统一配置;`electron-builder.config.cjs` 从统一配置读取,exe/安装包用 ASCII `InkVoyage`,快捷方式显示「墨航 InkVoyage」,`extraMetadata.name=inkvoyage` 让更新缓存落到 `inkvoyage-updater`,并关闭安装后自动启动;`stage-desktop.cjs`、`verify-desktop-installer.cjs`、`verify-desktop-package.cjs` 同步;
  2. **数据迁移**:新增 `desktop/src/runtime/identity.ts` 与 `dataDirMigration.ts`;`paths.ts` 的 `APP_NAME` 改为 `InkVoyage`,`server/src/runtime/appPaths.ts` 同步;首次启动用 staging 目录复制旧数据并保留旧目录,新目录非空跳过,失败不阻塞;
  3. **图标**:重写 `generate-desktop-icons.py` 生成「墨帆」全尺寸 PNG/ICO(小尺寸简化版),同步客户端、站点和 `site/src/assets`;新增 `generate-social-preview.py` 重做 GitHub/站点社交预览;
  4. **守卫**:新增 `server/tests/desktopIdentity.test.js`(5 条)与 `desktop/tests/dataDirMigration.test.cjs`(5 条),锁定身份、迁移、图标产物;安装器冒烟脚本改用无空格测试目录、移除 `ELECTRON_RUN_AS_NODE`、不预先创建安装目录并在结束时清理;
  5. **文档**:品牌 wiki、桌面身份迁移 wiki、release notes / README(2026-10-28)、BACKLOG/PROGRESS。
- **验证**:`node --test server/tests/licensing.test.js server/tests/desktopIdentity.test.js` **12/12**;`pnpm --filter @ai-novel/desktop test` **5/5**;`pnpm check:docs-manifest` 通过;`pnpm --filter @ai-novel/site build` 通过(37 路由);`pnpm --filter @ai-novel/client build` 通过;`pnpm build:desktop:all` + `node desktop/scripts/stage-desktop.cjs` 通过,暂存包 `productName=墨航 InkVoyage`、`appId=com.inkvoyage.desktop`、`executableName=InkVoyage`、`updaterCacheDirName=inkvoyage-updater`;`node desktop/scripts/verify-desktop-package.cjs` 通过;NSIS `InkVoyage-0.5.0-setup-x64.exe` 构建成功,`verify-desktop-installer.cjs` 完成安装/快捷方式/启动/卸载/重装数据保留验证并通过,测试目录与快捷方式已清理。
- **发布说明**:已记 release-notes/README(2026-10-28)。
- **遗留**:当前环境缺少 Windows 符号链接权限,electron-builder 解压 `winCodeSign` 失败;安装器验证使用 `--config.win.signAndEditExecutable=false` 构建,因此 exe 资源编辑(图标/版本信息/签名)未在安装器中实际验证。发布前建议在开启 Developer Mode 或管理员终端下补跑 `pnpm verify:desktop:installer`(不传 override)。`appId` 变化意味着新旧版本并排安装;`@ai-novel/*`、`AI_NOVEL_*`、数据库文件名与 Qdrant collection 按约定保持兼容。
- **下一步**:`beta` 已推送到 GitHub/Gitee,在 `beta` 做集成验证后再合入 `main`。

## 2026-10-26 · LOOP-65 · 公开前许可与旧品牌素材清理

- **类别**: 开源就绪(OPS 线收尾)
- **背景**: 所有者准备把私有仓库转为公开,要求处理剩余的许可附加限制、无归属第三方 skill 与旧品牌截图。
- **改动**:
  1. **许可**:`LICENSE` 去掉自定义前缀与“服务型商用须单独授权”条款,恢复纯 AGPL-3.0 原文;`NOTICE` 保留上游版权与独立衍生声明,补充上游 MIT/Apache/AGPL 历史许可、当前 AGPL-3.0-only 与商业合作说明;`README` License 段、`CLA.md`、`CONTRIBUTING.md` 同步去掉商业再许可承诺;
  2. **第三方 skill 与组件**:删除 `.agents/skills/shadcn-ui` 与 `.claude/skills/shadcn-ui`(来源 google-labs-code/stitch-skills,Apache-2.0,仓库内无独立许可归属),同步删除 `skills-lock.json`;为 `client/src/components/ui/` 中基于 shadcn/ui 的 UI primitives 新增 `THIRD_PARTY_NOTICES.md`(MIT, Copyright (c) 2023 shadcn),NOTICE/README/wiki 同步引用;
  3. **旧品牌素材**:删除角色库/知识库/导演模式旧截图 5 张与自动导演流程旧截图 8 张,移除对应公开文档图片引用;`auto-director-pipeline.md` 的“界面截图路径”改为“操作路径说明”;
  4. **社交预览**:用当前墨航 InkVoyage 品牌与桌面图标重做 1280x640 / 640x320 与站点 OG 图;
  5. **守卫**:`licensing.test.js` 扩为 7 条,锁定纯 AGPL、上游归属、第三方 MIT 归属、CLA 边界、workspace 许可、shadcn skill 不回流、旧品牌截图不回流;
  6. **远端 tags**:经所有者确认,删除 GitHub 上 67 个上游旧 tag,复核 `git ls-remote --tags github` 为 0;删除前清单保存在 `.logs/github-tags-before-delete-2026-10-26.txt`。
- **验证**:`node --test server/tests/licensing.test.js` 7/7;`check:docs-manifest` 通过;全库检查无残留旧图片引用;`git grep` 无旧品牌文件名;远端 tags 0。
- **发布说明**:已记 release-notes/README(2026-10-26)。
- **遗留**:GitHub Releases 需在页面核对并删除旧记录;桌面 productName/appId/APP_NAME 仍为旧技术标识(数据目录/更新通道迁移另行处理);UI-8 剩余截图由所有者补拍。
- **下一步**:核对 Releases 与仓库设置后切换仓库可见性。

## 2026-10-26 · LOOP-64 · 开发启动降噪(`pnpm dev` 控制台)

- **类别**: 开发体验 / 缺陷修复
- **背景**: 所有者反馈启动项目后控制台输出很多。
- **诊断**: ① 编辑 `server/src` 或 `shared` 时 ts-node-dev / tsc watch **正常重启**,日志频繁但只在保存文件时出现;② `dev:raw` 同时启动 client,服务端 ts-node 编译期间 Vite 对 `/api/health` 连续打印 `ECONNREFUSED`;③ Node 24 对 `run-with-log` 的“args 数组 + shell:true”报 `DEP0190`;④ 导演跟进/运行记录按设计每 3–4 秒轮询,用于实时状态。
- **改动**:
  1. `dev:raw` 的 client 改为 `dev:client:wait`(先等 3000 端口就绪再启动 Vite),消除启动期代理报错;
  2. `scripts/run-with-log.cjs` 改为显式拼接命令行后交给 shell,保留 Windows `pnpm.cmd` 解析,消除 `DEP0190` 弃用告警;
  3. 根 `dev` 在启动并发进程前先执行 `server/scripts/stop-stale-dev-server.cjs` —— 修复“旧服务端仍占 3000 → wait-for-port 误判就绪 → 旧进程被杀 → 新服务端编译期代理报错”的启动竞态(2026-10-26 日志复现);
  4. 新增 `pnpm dev:stop`(`scripts/stop-dev.cjs`):清理 ts-node-dev 残留并释放 3000/5173,用于 Ctrl+C 提示过多或终端关闭后进程残留的场景。
- **验证**: `pnpm dev` 启动后 server/client 均 200;无旧进程时启动阶段 `http proxy error` 0 条、`DEP0190` 0 条;`pnpm dev:stop` 后 3000/5173 均返回不可连接(000),文件保存触发的重启与轮询日志仍为预期行为。
- **发布说明**: 开发体验修复,无产品行为变化,跳过。
- **遗留**: 轮询频率与 `ts-node-dev` 重启日志属设计内行为;Windows 下 Ctrl+C 的 `终止批处理操作吗(Y/N)` 是 `cmd.exe` 对嵌套 `pnpm.cmd` 的正常提示(乱码为控制台编码),需逐层确认或使用 Windows Terminal/chcp 65001;如需更安静的日常开发,可单独跑 `pnpm dev:server` / `pnpm dev:client:wait`。

## 2026-10-26 · LOOP-63 · docs 收尾:删除过时计划、合并重复指南、补全 wiki 索引

- **类别**: 文档 / 流程收尾
- **改动**:
  1. 删除 `docs/plans/style-engine-workspace-structure.md`(LOOP-37 已完成但状态仍写“进行中”,0 引用);
  2. `docs/architecture/run-and-usage-guide.md` 的独有开发命令并入 README「常用命令」(`test:all` / `dev:site` / 桌面打包),随后删除重复指南;`docs/README.md` 索引改为指向 README + public 安装/使用方法;
  3. `docs/wiki/README.md` 索引从 19 篇补全到 **84 篇**(按 Architecture / Workflows / Prompts / RAG / Debugging / Product 分组,标题取自各页 H1);
  4. 保留 `docs/public`(站点 manifest)、`docs/wiki` 其余知识页、`docs/plans` 历史计划、`docs/design`、`docs/releases`、`docs/architecture/testing.md`。
- **验证**: 全库文档相对链接 **161 文件全部通过**;`check:docs-manifest` 35/35/17;文档总数 161 → **159**;工作区干净。
- **发布说明**: 纯文档整理,无产品行为变化,跳过。
- **遗留**: `docs/plans` 中已完成的 RF1/导演历史计划仍保留(可后续归档);wiki 内容未做逐篇时效复核。

## 2026-10-26 · LOOP-62 · 归属收尾:剩余上游标识与个人信息清理

- **类别**: 开源就绪(OPS 线收尾)
- **背景**: 所有者询问仓库是否仍含原项目信息、能否作为自己的项目上传 GitHub。
- **改动**:
  1. **法律归属保留**:NOTICE 上游版权与独立衍生声明、README License 段、AGPL 完整文本、`licensing.test.js` 守卫保持不变;NOTICE 增加修改版权行(Second123666,附正式发布前可替换法定姓名的说明);
  2. **非法律标识清理**:LICENSE 标题改为「墨航 InkVoyage License」并注明衍生关系;CLA/CONTRIBUTING 项目名;`site/scripts/generate-sitemap.cjs` 与 `prerender.cjs` 的 origin/base(此前 site build 会重新生成上游 URL,本轮修复根因并重生成 sitemap);桌面构建默认 owner/repo 与 desktop author;wiki 站点路径;
  3. **个人信息清理**:移除 README 的上游支付宝捐赠段(二维码图片已不在工作区)与上游 QQ 群二维码段,改为 GitHub Issues 入口;
  4. **保留**:上游 Ani Book Skill/Agent 链接(明确标注上游维护)、历史 release-notes、git 历史与作者归属;桌面 productName/appId/APP_NAME 与 `@ai-novel/*` 包作用域保持稳定(涉及数据目录/更新通道,需迁移方案另立)。
- **验证**: site build 通过,sitemap 中上游 URL **0** 条(37 路由预渲染);`licensing.test.js` **4/4**;`check:docs-manifest` 通过;README 相对链接复检通过。
- **发布说明**: 仓库治理与归属清理,无产品行为变化,跳过。
- **遗留**: 桌面安装器/数据目录仍显示旧技术标识(需迁移);其余截图旧品牌由 UI-8 尾图处理。
- **素材收尾(A/B 档)**:
  - 删除 23 个未被引用的 tracked 文件:`images/` 旧截图/旧格式 18 张(约 4.6MB)、`site/src/assets` 未引用 4 个(约 1.1MB)、0 字节垃圾文件与空 `server/tmp/query_out.txt`;`images/` 从 13MB 降至 8.1MB(保留 31 张被引用图片与 GitHub 社交预览源);
  - `TASK.md` 从上游 2026-09 私有分支任务板重写为「当前发展路线与优先级」(当前状态/优先级/中期方向/非目标/续跑入口);
  - 未跟踪的 `server/tmp/db-backups` 与 `.logs`/`.playwright-mcp` 仅本地保留/可清理,不入库。

## 2026-10-26 · LOOP-61 · INN-A1b 第二、三批:体验打磨与契约接线

- **类别**: UI + 缺陷收口(A 线写作质量;主对话执行)
- **目标**: INN-A1b 剩余项 —— G11 窗口行内编辑、G15 卡片筛选与章节跳转、G18 同步状态与手动重建、G24 快照双轨说明、G19 验收死字段接线、G25 Markdown 导出伏笔清单。
- **改动**:
  1. **G11/G15/G18/G24(客户端)**:`BookPayoffLedgerCard` 新增状态筛选(全部/待跟进/逾期/已回收/已失效)、埋设/兑现/最近章节跳转、逐条「编辑窗口」行内表单、最近同步时间与「同步已过期」标记、「重新同步」按钮;快照区改为双轨说明(读时升序 vs 快照时点,以台账为准);
  2. **同步端点**:新增 `POST /novels/:id/payoff-ledger/sync`(应用服务契约与 facade 同步暴露),客户端 `syncNovelPayoffLedger`;
  3. **G19**:`requiresFullPayoffReconcile` 不再是死字段 —— 验收结果落库时(persist≠false)触发全量伏笔对账,进程内按章节去重,失败允许下次重试;候选评估不触发;
  4. **G25**:Markdown 导出在「质量修复/流水线」段新增可读伏笔清单(状态/目标窗口/原因,最多 50 条 + 余量提示),并补「已回收 / 已失效」计数;JSON 完整数据保持;
  5. 守卫:client `payoffLedgerUi.test.js` 3 条(筛选/跳转、窗口编辑与同步、双轨说明);server 测试补 G19 触发条件与 G25 导出内容、同步路由契约。
- **验证**: client typecheck 0 错误、client **283/283**;server build 0 错误、全量 **1484 测试 / 1472 过 / 0 失败 / 12 跳过**。
- **发布说明**: 用户可见,已记 release-notes/README(2026-10-26)。
- **遗留**: INN-A1b 清单全部划除;UI 视觉验收留待所有者。
- **下一步**: BACKLOG 可执行项全部闭环,剩余 UI-8 尾图由所有者补拍。

## 2026-10-26 · LOOP-60 · INN-A1b 第一批:伏笔注入链路调优

- **类别**: 创新 / 调优(A 线写作质量;主对话执行)
- **目标**: INN-A1b 注入保底与排序清单 —— A1-G2/G3/G5/G6/G7/G8/G9/G23 + planner 空账本回退。
- **改动**:
  1. **G2/G9**:`payoff_ledger` 块进入 writer 资产 `preferredGroups`、`contextRequirements`(priority 94)与运行时预算档案,防止预算静默丢弃;
  2. **G3**:canonical 快照新增 `riskSignals`(可选默认 []),`toCanonicalPayoff` 与运行时账本透传风险信号;confidence 一并保留;
  3. **G5**:逾期条目注入指令从 `pressure` 升级为 `payoff`(要求本章兑现或明确说明延期),`chapterContractBoundary` 断言同步;
  4. **G6**:新增 `sortPayoffItemsByWindow`,pending 按目标窗口(截止早优先、无窗口最后)排序,快照与运行时共用;
  5. **G7**:台账注入上限(紧急 4 / 逾期 4 / 待推进 3)+ 溢出汇总行,防止长篇账本吃光预算;
  6. **G8**:provider contract 新增 `payoff_ledger` 遥测(有账本才评估,缺失按 degrade 记录);
  7. **G23**:`sync_stale` 风险信号进入合成问题,附带"重新同步账本"修复建议;
  8. **planner 空账本回退**:账本为空时从最近状态快照的伏笔终结状态补齐 paidOff/failed,回退摘要不再恒 0;
  9. **顺带修复**:导演执行模块钉住的伏笔对账资产版本 `v5` → `v6`(与注册表一致);
  10. 守卫 `payoffLedgerInjectionTuning.test.js`(8 条):排序、透传、逾期升级、上限截断、遥测、sync_stale、回退计数、版本钉住。
- **验证**: server build 0 错误;全量 **1481 测试 / 1469 过 / 0 失败 / 12 跳过**;client 未动,沿用 LOOP-59 `280/280`。
- **发布说明**: 内部注入质量与排序调优,无用户可见变化,跳过。
- **遗留**: INN-A1b 剩余 G11(窗口行内编辑)、G15(卡片筛选与章节跳转)、G18(同步状态标记与手动重建)、G19(验收字段接线)、G24(快照双轨说明)、G25(Markdown 导出伏笔清单)。
- **下一步**: LOOP-61 = INN-A1b 第二批(UI:G11/G15/G18/G24)。

## 2026-10-26 · LOOP-59 · OPS-2 品牌与身份统一(墨航 InkVoyage)

- **类别**: 开源就绪 / 品牌(OPS 线;所有者定名)
- **目标**: 把项目从上游身份统一为「墨航 InkVoyage」,身份链接指向自有仓库与 Pages。
- **改动**:
  1. 显示名统一:README 标题、客户端导航/移动端头部/桌面启动壳与错误弹窗、`client/index.html`、桌面窗口 title、站点品牌/标题/meta/结构化数据、public 文档(introduction/installation);
  2. 身份链接:README Releases/Latest/Pages、客户端 GitHub 入口、站点 repo/Stars/canonical/OG/sitemap/robots、PR 模板 CLA、桌面发布 workflow 的 owner/repo 全部改为 `Second123666/AI-novel` 与 `second123666.github.io/AI-novel/`;移除上游 Trendshift 徽标;
  3. Pages base path:`site/vite.config.ts`、`site/index.html`、`site/public/404.html` 的 base 改为 `/AI-novel`(否则部署后静态资源 404);
  4. 归属保留:NOTICE 补充当前名称并保留上游版权;README License 段、Ani Book Skill / ani-book-agent 明确标注「上游作者维护」;
  5. 内部技术标识保持稳定(包作用域 `@ai-novel/*`、桌面 productName/appId、desktop APP_NAME 数据目录),避免破坏数据路径与更新通道;规则写入 wiki `product/brand-and-identity.md`;
  6. 发布说明补充更名条目;
  7. 用新品牌重截 LOOP-58 的 20 张截图(导航/窗口显示「墨航 InkVoyage」),替换同名文件,避免文档文案与截图品牌冲突。
- **验证**: client typecheck 0 错误、client **280/280**;site typecheck 0 错误、build 通过且 `base = "/AI-novel"`(37 路由预渲染);desktop typecheck 0 错误;docs manifest 35/35/17;35 个 md 相对链接全通过。
- **发布说明**: 更名用户可见,已记 release-notes/README(2026-10-26 优化)。
- **遗留**: 桌面 productName/appId/数据目录名与 npm 包作用域未跟随显示名(需迁移方案,另立轮次);Gitee 镜像链接可后续加入 README。
- **下一步**: 剩余仅 UI-8 尾图(所有者自处理);BACKLOG 全部可执行项闭环。

## 2026-10-26 · LOOP-58 · UI-8 公开文档截图刷新(部分完成)

- **类别**: UI / 文档资产(主对话执行)
- **目标**: 用当前 UI + 真实示例数据替换过期的公开文档与 README 截图。
- **执行**:
  - 启动本地 dev(使用 `server/dev.db` 的真实数据:2 本书 / 22 章 / 导演任务);启动前按数据保护规则把 `dev.db` + 主密钥备份到临时目录(不入库);
  - 替换 18 张截图:首页、小说列表、世界样本库、题材基底库、推进模式库、写法引擎、反 AI 规则、运行记录(按「小说流水线」筛选,避开测试任务噪音)、模型路由、创作中枢(绑定小说)、项目设定、故事宏观规划、角色准备、卷战略/卷骨架、节奏/拆章、章节执行、正文编辑页、世界手册;
  - 新增 `images/系统设置.png`(系统设置总览,修正此前复用模型路由截图的错配)与 `images/导演跟进中心.png`(导演跟进中心,替换此前误用的质量修复图);同步 3 处文档图片引用与 alt 文案。
- **验证**: 35 个 md 相对图片/链接全部存在;`check:docs-manifest` 通过;新截图统一 1440×900;dev 服务已停止。
- **遗留**: 数据缺失页面保留旧图待补拍 —— 拆书分析、知识库、标题工坊、基础角色库(均需示例数据)、质量修复页(内容偏空)、自动导演创建/候选流程、角色库等。→ UI-8 保持 `[/]`。
- **发布说明**: 文档资产刷新,无产品变化,跳过。
- **下一步**: OPS-2 待新项目名;UI-8 剩余截图待数据准备。

## 2026-10-26 · LOOP-57 · BUG-7 待手动恢复标记语义收敛

- **类别**: 缺陷修复(运行时契约;主对话执行;所有者已决策:仅显式用户恢复动作可清除)
- **目标**: 命令入队不再无条件清除 `pendingManualRecovery`;agent 工具与后台自动入队保留标记。
- **改动**:
  1. `DirectorCommandService`:相关 enqueue 方法新增 `options.clearPendingManualRecovery`(默认 false);`markCommandAcceptedOnTask` 仅在显式 true 时清除标记,写入侧按条件携带 `pendingManualRecovery: false`;
  2. 显式用户恢复入口传 true:导演命令 HTTP 入口(continue / resume_from_checkpoint / retry / approve_gate / accept_manual_changes / takeover)、工作流 continue 的 approve/continue 两条路径、创作体验选择、导演跟进动作执行器、任务适配器 continue、任务恢复服务;
  3. agent 工具(`directorRuntimeTools`)与后台自动恢复(`NovelWorkflowRuntimeService`)保持默认不清除;
  4. 守卫 `pendingManualRecoverySemantics.test.js`(3 条:默认保留条件写、清除白名单 + agent/后台禁入、用户入口覆盖计数);3 条既有导演命令测试更新到新契约(默认保留 / 显式清除)。
- **验证**: server build 0 错误;全量 **1473 测试 / 1461 过 / 0 失败 / 12 跳过**;client 未动,沿用 LOOP-56 `280/280`。
- **发布说明**: 用户可见修复,已记 release-notes/README(2026-10-26 修复)。
- **遗留**: 无。
- **下一步**: 剩余仅 OPS-2(待新项目名)与 UI-8(需真实数据环境)。

## 2026-10-26 · LOOP-56 · UI-6 受控分类色 token

- **类别**: UI(设计系统;主对话执行;所有者已决策:新增受控 category token)
- **目标**: 给“分类 chip”一套受控调色板,消除 sky/violet/emerald/amber/rose 等散落调色板色。
- **改动**:
  1. 新增 `category-1..6` token(浅色/深色两套,`index.css`)+ Tailwind 暴露(`category-N`);
  2. 漫画角色/面板两个文件迁移:性别、资产类型、事实类别、面板类型、密度 → category token;生成状态点 → info/success/destructive;AI 协助框 → info;待重抽提示 → warning;
  3. 设计规范新增「分类色」规则(`docs/design/product-ui-design-system.md`);守卫 `categoryColorContracts.test.js`(2 条:token 定义完整、目标文件零调色板残留 + 状态语义正确)。
- **验证**: client typecheck 0 错误;client **280/280**;client build 通过且产物 CSS 含 `bg/border/text-category-*`;server 未动,沿用 LOOP-54 `1470 / 1458 / 0`。UI 视觉验收(明暗两套)留待所有者。
- **发布说明**: 分类 chip 色彩收敛属细微视觉调整,按规则跳过。
- **遗留**: 可视化画布的分类色(关系图/世界图谱节点)仍为独立设计面,可后续复用同一 token 体系迁移。
- **下一步**: BUG-7 恢复语义(已获决策)。

## 2026-10-26 · LOOP-55 · OPS-1 转公开前本地历史清理

- **类别**: 开源就绪(安全 / 仓库治理;主对话执行,所有者已批准)
- **目标**: 删除上游历史引用与含旧密钥对象,完成转公开硬前置;不推送任何内容。
- **执行**:
  1. 盘点:3 个远端(自有 gitee/github + upstream),41 个 upstream 跟踪引用,67 个上游 release tag,均指向含 db 备份的上游历史(自 `fb39b485` 起);
  2. 删除 upstream 远端(连带 41 个跟踪引用);
  3. 删除 67 个上游 tags(0 个在 main 祖先链上);
  4. `git reflog expire --expire=now --all` + `git gc --prune=now`。
- **验证**:
  - refs 仅剩 `main` + `gitee/main` + `github/main`;可达提交 **2597 → 1363**;
  - 历史中 `.db/.sqlite` 文件 **0**;
  - 全历史密钥模式命中仅 7 个测试夹具假值(`sk-scope…` / `sk-dialogue…` 等,掩码核验),无真实密钥;db 备份对象已不可达;
  - `git fsck --unreachable` 为空;工作区干净,HEAD 未变。
- **发布说明**: 仓库治理操作,无产品变化,跳过。
- **遗留**: 本次只清理本地;转公开前需用 `git ls-remote --tags` 核对**远端仓库**是否仍有上游旧 tags(如有,删除后只推 main,遵守红线)。
- **下一步**: UI-6 分类色 token / BUG-7 恢复语义(均已获所有者决策)。

## 2026-10-26 · LOOP-54 · UI-7① 故事时间线视图

- **类别**: UI / 创新增量(可视化;主对话执行;UI-7 收官)
- **目标**: UI-7 第一项 —— 小说级故事时间线可视化与伏笔追踪。
- **改动**:
  1. 共享契约 `StoryTimelineOverview`(事件 + 伏笔 + 截断统计);
  2. 服务端只读端点 `GET /api/story-timeline/:novelId`(归位 `modules/timeline/http`):repository 新增 `listEventsForNovel` / `listHooksForNovel`(limit+1 判定截断),service 聚合;
  3. 客户端纯函数 `buildStoryTimelineGraph`:章节分列、事件按 eventOrder 排列、前置/后续依赖边去重;状态/类型/来源/可见性中文标签;
  4. `StoryTimelineCanvas`(React Flow):章节时间轴、依赖边(虚线前置/实线后续)、点击事件查看详情;
  5. 页面 `/novels/:id/story-timeline`:状态筛选、未回收伏笔列表(优先级排序 + 到期未回收标记)、截断提示;小说工作区「项目工具」入口;移动端路由与 CSS 合同;
  6. 守卫测试:client 3 条(布局/依赖边/接入与移动端)、server 2 条(投影聚合与截断、只读路由)。
- **验证**: shared build ✅;client typecheck 0 错误、client **278/278**;server **1470 测试 / 1458 过 / 0 失败 / 12 跳过**。UI 视觉验收留待所有者。
- **发布说明**: 用户可见,已记 release-notes/README(2026-10-26 新增)。
- **遗留**: UI-7 整项完成;RAG 追踪图表暂缓(数据在检索追踪页,可另立)。
- **下一步**: UI-8 截图刷新(需真实数据环境)。

## 2026-10-26 · LOOP-53 · UI-7② 自动导演工作流步骤图(React Flow + dagre)

- **类别**: UI / 创新增量(可视化;主对话执行)
- **目标**: UI-7 第二项 —— 用 step catalog 的编排元数据渲染可交互步骤图。
- **改动**:
  1. 纯函数 `workflowStepGraphLayout.ts`:22 个步骤节点 + 前置依赖边,Dagre LR 层次布局,输出确定性;`resolveHighlightedStepIds` 按 checkpoint(优先)或当前阶段解析高亮;
  2. `WorkflowStepGraphCanvas`(React Flow):节点显示步骤名与阶段名、箭头依赖边、`fitView` 与缩放控制;当前步骤 primary ring 高亮;
  3. 导演跟进页新增「工作流步骤图」折叠区,选中跟进任务时传入 `checkpointType/currentStage`;画布经 `React.lazy` 仅在展开时加载;
  4. 守卫测试 3 条:布局确定性与依赖边完整性、高亮解析、懒加载与依赖纪律。
- **验证**: client typecheck 0 错误;client **275/275**;server 未动,沿用 LOOP-50 全量 `1464 / 1452 / 0`。UI 视觉验收留待所有者。
- **发布说明**: 用户可见,已记 release-notes/README(2026-10-26 新增)。
- **遗留**: UI-7 剩余 ①故事时间线视图(需小说级时间线只读端点)。
- **下一步**: LOOP-54 = UI-7① 故事时间线视图。

## 2026-10-26 · LOOP-52 · UI-7③ 生产看板统计图表(Recharts)

- **类别**: UI / 创新增量(可视化;主对话执行)
- **目标**: UI-7 第三项 —— 把质量分布与字数统计做成图表,按可视化栈纪律使用 Recharts。
- **改动**:
  1. `productionBoardModel` 扩展两份纯函数聚合:`wordCountByVolume`(按卷汇总字数,未挂卷章节单列)与 `debtIssueCounts`(质量债务问题码按命中章节数降序,取前 8);
  2. 新增 `ProductionStatsCharts`(Recharts 饼图/柱图):章节状态占比(语义 token 着色)、各卷字数、质量债务问题分布,均含空态;
  3. 看板页以 `React.lazy` 懒加载图表 chunk,看板主界面与首屏不引入 Recharts;
  4. 守卫测试:聚合正确性 + 懒加载纪律 + 图表禁用硬编码色。
- **验证**: client typecheck 0 错误;client **272/272**(新增 1 条);server 未动,沿用 LOOP-50 全量 `1464 / 1452 / 0`。UI 视觉验收按规则留待所有者。
- **发布说明**: 用户可见,已记 release-notes/README(2026-10-26 新增)。
- **遗留**: UI-7 剩余 ①故事时间线视图、②自动导演工作流步骤图;RAG 追踪图表未并入(数据在检索追踪页,可后续补)。
- **下一步**: LOOP-53 = UI-7② 自动导演工作流步骤图(React Flow + dagre)。

## 2026-10-26 · LOOP-51 · 对外文档审校(OPS-4)

- **类别**: 文档 / 开源就绪(OPS 线;主对话执行)
- **目标**: OPS-4 —— README 与 docs/public 的对外表述、链接、产品事实一致性全面审校。
- **审计方法**: 3 个只读子代理并行(21 篇模块文档 / 13 篇顶层·流程·手册 / 全量链接与 site manifest);高严重度结论逐条回归代码核实(`RUN_MODE_OPTIONS`、运行记录只读语义、加密备份要求),不盲信审计意见。
- **改动**:
  1. **失效链接 ×7**(全在 development-roadmap.md):`#/docs/flow-*`、`playbook-*` 旧 slug 改为 manifest 现行 id;删除指向不存在的 `module-book-world` 链接。**防回退**:`scripts/check-docs-manifest.cjs` 新增文档内 `#/docs/<id>` 校验(负向注入坏 slug 确认可拦截),现校验 35 文档 / 35 可寻址 id / 17 阶段 key。
  2. **过时产品流程重写 ×5 文档**:自动导演已无"四种运行模式"—— 创建页固定「先完成导演准备」,准备完成后选简易创作/专业创作,「正文后去 AI 检测与修正」为开关(以 `RUN_MODE_OPTIONS` / `DEFAULT_VISIBLE_RUN_MODE` 与接管页代码为准);重写 faq、usage-guide、end-to-end-production、auto-director-pipeline、first-novel-walkthrough 相关段落,删除展示已下线模式的旧截图(README 同名旧图一并移除)。
  3. **术语统一**:「任务中心」→「运行记录」61 处(16 文件,仅保留图片文件名);「新手上路」→「创作向导」14 处(与导航一致);「漫画工坊」→「漫画工作台」;novels「三种开书入口」改正为四种;site manifest 三条标题/描述同步(运行记录只读定位、创作中枢只读定位)。
  4. **安全事实**:installation/faq/troubleshooting 备份清单补主密钥文件(`data/secrets/master.key`)与成对备份说明(API Key 已加密落库,缺主密钥无法恢复)。
  5. **恢复手册去实现化**:recovery-by-phase 的 waiting approval / taskId / checkpointType / stale 等内部说法改为页面可见语言;troubleshooting 移除面向开发者的架构规则;task-center 队列章节加「开发者参考」定位;vibe-coding 页注明面向维护者。
  6. **README**:最新更新块与 release-notes 对齐到 2026-10-26(并修正"安全"小节混入修复项的错位);6 处改口式/开发者向表述清理;文档计数补充"另有完整版本更新历史"。
  7. **release-notes 收尾**:按日期拆分 10-25/10-26 块并清除"不再/现在"式叙述(此前工作区遗留改动,本轮核验后纳入提交)。
  8. **wiki**:新增 `docs/wiki/product/public-docs-maintenance.md` —— 对外文档维护规则(manifest 登记与 slug 守卫、术语以 UI 为准、流程变更全量同步、截图与主密钥备份要求、技术文档边界)。
- **验证**:
  - 全量相对链接复检:35 个 md(34 docs/public + README)**ALL LINKS OK**,图片目标全部存在;
  - `pnpm check:docs-manifest`:35 文档登记 / 35 可寻址 id / 17 导演阶段 key;负向注入坏 slug 时正确失败;
  - `pnpm --filter @ai-novel/site typecheck`:0 错误(manifest 是唯一 TS 改动);
  - server/client 运行时零改动,沿用 LOOP-50 全量 `1464 / 1452 / 0` 与 LOOP-46 client `271/271`;UI 验收(截图)按规则留待所有者。
- **遗留**:
  - 公开文档与 README 的产品截图多处与当前 UI 不一致(旧侧栏「任务中心/短剧即将推出/漫画 Beta」、旧模型路由页、旧创作中枢),需在配置好数据的真实环境重截 → **UI-8**;
  - README/site/client 的上游身份链接(Releases、GitHub Pages、Trendshift、vibe-doctor 的 GitHub blob)与命名定稿绑定 → 并入 **OPS-2** 输入清单;
  - 技术型 flow/模块文档保留内部实现参考(README 明示「自动导演阶段全景」供开发者查阅),已用「开发者参考/代码来源」标注边界。
- **发布说明**: 纯文档审校,无产品行为变化,未新增发布说明条目;release-notes 既有条目的日期归属与表述已修订。
- **下一步**: OPS-4 完成。后续 **UI-7(可视化增量)/ UI-8(截图刷新)** 可排期执行;**UI-6(分类色)、BUG-7(恢复豁免语义)、OPS-1(转公开)、OPS-2(命名与身份链接)** 需所有者拍板。

## 2026-10-26 · LOOP-50 · OPS-3 许可、归属与贡献授权梳理

- **类别**: 开源就绪(OPS 线;主对话执行)
- **审计**: 许可栈已存在且基本完整 —— `LICENSE`(双许可摘要 + AGPL-3.0 全文)、`NOTICE`、`CLA.md`(版权保留 + 再许可权)、`CONTRIBUTING.md`、README 许可段;根与 5 个 workspace 包 `license` 均为 `AGPL-3.0-only`;无冲突许可文件。
- **缺口与修复**:
  1. `NOTICE` 仅署名上游,未声明本仓库为**独立衍生版本** → 补充衍生声明:上游版权与许可条款保留,本仓库修改与新贡献归当前维护者与贡献者(不依赖尚未定稿的品牌名,兼容 OPS-2 更名);
  2. README 许可段同步衍生归属说明;
  3. 新增 wiki `product/licensing-and-attribution.md`:文件职责、包声明一致性、第三方素材披露、不新增冲突许可、更名不得抹除上游归属、失败模式;
  4. 守卫 `licensing.test.js`(4 条:文件齐全 + AGPL 全文 + 服务型商用条款;NOTICE 上游归属与衍生声明;CLA 版权保留与商业再许可;所有包 license 一致)。
- **验证**: 守卫 4/4;server 未改代码,沿用 LOOP-49 全量 1464/1452/0。client 未动。
- **发布说明**: 许可与归属属仓库治理信息,不改变产品行为,按规则跳过 release-notes/README 最新更新。
- **残留**: OPS-2 品牌命名仍待所有者拍板;OPS-1 转公开历史清理待所有者决定公开时执行。
- **下一步**: **LOOP-51 = OPS-4 对外文档审校**;UI-6 / UI-7 / BUG-7 仍等所有者决策。

## 2026-10-26 · LOOP-49 · RF-5 依赖面收敛

- **类别**: 重构(RF 线;主对话执行)
- **目标**: RF-5 —— prompting→services 循环依赖排查 + RAG 单例惰性化。
- **审计方法**: 自写模块图扫描器遍历 `server/src` 全量 `.ts`,区分**值导入**与 `import type`(类型边编译后擦除,不构成运行时环),DFS 检测环。
- **结论**:
  - 初版扫描报告的 23 个环**全部由类型导入构成**(如 `promptTypes ↔ slotTypes` 双向 `import type`;`stateSchemas → stateSnapshotExtraction` 为 `import type`),修正解析器(逐 import 语句、过滤纯 type 子句)后**运行时环 0**;prompting↔services 无运行时环;
  - 现存 prompting→services 引用以 schema/纯工具常量为主,不构成循环,但作为边界约束写入 wiki(新增资产不得扩大该依赖面)。
- **改动**:
  1. `services/rag/index.ts` 改为**惰性单例 getter**(9 个服务按需实例化,重复访问返回同一实例),冷启动不再立即构造整条 RAG 依赖链;
  2. 守卫 `dependencyGraph.test.js`(2 条:值导入全图零环 + RAG getter 惰性/单例契约);
  3. `module-boundaries.md` 补充运行时无环、重单例惰性化、prompting 依赖边界三条规则。
- **验证**: server build 0 错误;守卫 2/2;server 全量 **1464 / 1452 过 / 0 失败 / 12 跳过**。client 未动。
- **发布说明**: 纯内部依赖治理,无用户可见变化,按规则跳过。
- **下一步**: **LOOP-50 = OPS-3(LICENSE/NOTICE/CLA)** 或 OPS-4;UI-6 / UI-7 / BUG-7 仍等所有者决策。

## 2026-10-26 · LOOP-48 · RF-4 文档一致性清理

- **类别**: 文档 / 重构收尾(RF 线;主对话执行)
- **目标**: RF-4 —— `docs/` 与代码引用对齐。
- **审计方法**: 扫描 160 个 markdown 文件的 519 个仓库内路径引用 + 相对链接,逐一校验存在性。
- **修复**:
  1. `auto-director-runtime.md`:4 个导演模块路径更新到 `commands/`、`runtime/` 子目录;
  2. `knowledge-and-context-assembly.md`:`bookAnalysis.publish.facets.ts` → `bookAnalysis/publish/…`;
  3. `auto-director-world-setup.md`:`NovelAutoDirectorSetupPanel.tsx` → `DirectorTakeoverEntryPanel.tsx`;
  4. `director-mode-module-state-refactor-checklist.md`:路径同步到现结构,`DirectorRuntimeExecutionService.ts` 标注"已并入 NovelDirectorService / pipeline runtime",并在文首加历史计划说明(不篡改记录语义)。
- **结果**: 519 个引用中失效项从 15 降至 **3**,且剩余 3 项均为设计上不在仓库内/构建产物(`client/.env`、`client/.env.local`、`site/dist`);相对链接无失效(1 条为绝对 URL 误报)。
- **验证**: 纯文档改动,未跑测试;引用扫描脚本零真实失效。server/client 未动。
- **发布说明**: 纯内部文档整理,无用户可见变化,按规则跳过。
- **下一步**: **LOOP-49 = OPS-3(LICENSE/NOTICE/CLA 梳理)** 或 OPS-4(对外文档审校);UI-6 / UI-7 / BUG-7 仍等所有者决策。

## 2026-10-26 · LOOP-47 · RF-3 密钥存储加固(API Key 加密落库)

- **类别**: 安全 / 重构(RF 线;主对话执行)
- **目标**: RF-3 —— `DatabaseSecretStore` 明文存储 API Key 改为加密存储,处理旧数据迁移与桌面兼容。
- **设计**:
  1. AES-256-GCM,格式 `enc:v1:<iv>:<tag>:<ciphertext>`(base64);无前缀按存量明文透传;
  2. 主密钥优先级:`AI_NOVEL_MASTER_KEY` → `AI_NOVEL_MASTER_KEY_PATH` → `<cwd>/data/secrets/master.key`(首次自动生成,0600);桌面端 cwd 即用户数据目录,密钥与 SQLite 同目录;
  3. 写入加密 / 读取解密(create/update/upsert/get/list);
  4. 启动迁移 `migratePlaintextSecrets()`:幂等、仅处理未加密行、加密→解密往返校验后才写回、单行失败保留原值;在 `loadProviderApiKeys()` 之前执行;
  5. 解密失败按"该厂商未配置"降级并告警,不阻塞启动。
- **改动**:新增 `secretCipher.ts`、重写 `DatabaseSecretStore`、`app.ts` 启动接线、双 `.env.example` 文档化主密钥与备份要求、wiki `architecture/secret-storage-encryption.md`、守卫 `secretStorage.test.js`(5 条)。
- **验证**: server build 0 错误;守卫 5/5(往返/随机 IV/篡改/密钥不匹配/明文兼容/写入加密读取解密/迁移幂等无损);server 全量 **1462 测试 / 1450 过 / 0 失败 / 12 跳过**。client 未动。途中修 2 个自写加密格式缺陷(join 空分隔、前缀重复冒号)。
- **数据安全说明**:迁移为逐行就地更新且带往返校验,不删除任何行;首次启动真实库前建议先备份 `server/dev.db` 与 `data/secrets/master.key`(密钥文件与其成对备份)。本轮未执行真实库迁移(未启动服务)。
- **发布说明**: 自托管用户可感知的安全加固(数据库不再保存明文密钥),已记 release-notes/README(2026-10-26)。
- **残留**: 主密钥轮换工具未做;旧备份中的明文密文混合需人工确认。
- **下一步**: **LOOP-48 = RF-4 文档一致性清理** 或 **OPS-3/4**;UI-6 / BUG-7 仍等所有者决策。

## 2026-10-26 · LOOP-46 · UI 线收尾:UI-1 第六批 + UI-2 + UI-4 + UI-5(UI-3 审计)

- **类别**: UI(设计系统与产品体验收尾;主对话执行)
- **目标**: 所有者要求「把 UI 部分执行完」—— 收尾 UI-1 第六批,推进 UI-2/3/4/5。
- **UI-1 第六批收尾(可访问性 + 文案)**:
  - 图标按钮可访问名称审计:全站 110 个候选逐一核对,**19 个初筛全部为「图标 + 动态文本」误报,真实缺口 0**;审计结论记录,不制造无意义改动;
  - 文案复核:本会话新增文案均按用户视角撰写(入口/动作/效果/当前结果),未发现流程叙述式文案。
- **UI-2(主题与氛围层)**:明暗/暖纸主题切换与语义 token 已具备;补齐**全局 `prefers-reduced-motion` 降级**(动画/过渡降至 0.01ms,信息仍由文案与状态色传达)。
- **UI-4(编辑器与阅读体验)**:预览页排印(17-18px / 行高 2.15)与章节导航已具备;新增章节编辑器**专注模式**(隐藏侧栏与 AI 面板、正文单栏居中,右上角常驻进出按钮)。
- **UI-5(开源 Showcase)**:新增 `HomeShowcaseHero` —— 仅在新访客(无小说)首页展示:产品定位一句话 + 开始第一本小说 CTA + 三个主链亮点;**表述与 `site/` 保持一致**;已有创作用户保持行动优先首页不被干扰。
- **UI-3(可视化富化)审计**:世界图谱、角色关系、紧张度曲线、故事世界图谱**均已使用 React Flow**(上游实现 + LOOP-13/14);剩余时间线视图/导演步骤图/统计面板为**增量提案**,登记 UI-7,等待所有者排期。
- **验证**: client typecheck 0 错误;新增守卫 `uiPolishContracts`(reduced-motion / 专注模式 / showcase 3 条)全部通过;client **271/271**。server 未动。
- **发布说明**: showcase 首屏、专注模式与减少动效均为用户可见,已记 release-notes/README(2026-10-26)。
- **状态**: **UI-1 整项完成(六批全部完成)**;UI-2 ✅、UI-4 ✅、UI-5 ✅;UI-3 部分完成(主要面已达标,增量登记 UI-7)。
- **下一步**: UI-7(可视化增量)/ BUG-7 / 其他 OPS 项;UI-6 仍待所有者决策。

## 2026-10-26 · LOOP-45 · UI-1 第六批(第四组):零散组件状态/中性色

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: 第六批下一组 —— 9 个零散组件的 76 处色彩(状态/中性混排)。
- **改动**:
  1. `NovelStyleRecommendationCard`:slate 中性 + 白底 → 语义 token;反色深色面板 `bg-slate-950 text-white` → `bg-foreground text-background`(语义反转,深浅皆适配);
  2. `list/NovelProjectCard`:项目状态色(amber/emerald/sky)→ warning/success/info;
  3. `workspaceShell`:`info/success/warning` tone 映射从 sky/emerald/amber 改为同义 token;
  4. `CharacterAssetSidebar`:主角/群像标记 → success/info;
  5. `StoryEngineStudio`、`CharacterCastOptionsSection`、`CharacterFocusSummary`、`NovelBasicInfoForm`、`StructuredOutlineWorkspace`:就绪/警告/applied/锁定提示 → success/warning;
  6. 圆角 rounded-2xl→rounded-lg;守卫扩至 **20 文件**。
- **验证**: client typecheck 0 错误;守卫 3/3;client **268/268**。server 未动。复扫 9 文件 **0 残留**。
- **发布说明**: 写法推荐卡随主题适配、项目列表状态色一致,用户可见(写法推荐卡深色失配修复),已记 release-notes/README(2026-10-26)。
- **残留**: 第六批其余(CharacterRelationshipGraphPanel 分类色→UI-6、storyMacro 其余、CharacterDynamics 已完);UI-6;`.mobile-route-*` 迁移。
- **下一步**: **LOOP-46 = 第六批收尾或 UI-5 开源 Showcase**;UI-6 / BUG-7 等所有者决策。

## 2026-10-26 · LOOP-44 · UI-1 第六批(第三组):封面弹窗主题适配

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: 第六批下一组 —— `NovelCoverDialog` / `NovelCoverCard`(75 处)色彩性质审计与迁移。
- **审计结论**: 这批以 **slate 中性色 + 硬编码 `bg-white`/`text-slate-900`** 为主(26×slate-200 边框、8×slate-500 次要文本、12×bg-white 背景、7×focus ring),构成**浅色专用弹窗** —— 深色模式下白底+深灰字与页面失配;少量 emerald/amber 是状态 chip。非分类色,可安全语义化。
- **改动**:
  1. `bg-white` → `bg-background`;`text-slate-900/700/600/500/400` → `text-foreground` / `text-muted-foreground`;
  2. `border-slate-200/300` → `border-border`;`bg-slate-50(/55,/60,/65)` → `bg-muted/40`;`bg-slate-100` → `bg-muted/30`;
  3. 焦点环 `focus:border-slate-400 ring-slate-200` → `border-ring` / `ring-ring/40`(项目已有 `--ring` token);
  4. emerald/amber 状态 chip → `success/warning`;
  5. 守卫 `statusColorContracts` 扩至 **11 文件**并新增 `bg-white`/slate 检测。
- **验证**: client typecheck 0 错误;守卫 3/3;client **268/268**。server 未动。复扫封面两文件 **0 残留**。
- **发布说明**: 封面生成弹窗随主题适配(深色模式不再白底失配),用户可见,已记 release-notes/README(2026-10-26)。
- **残留**: 第六批其余零散组件(NovelStyleRecommendationCard、CharacterAssetSidebar 等);UI-6(promptWorkbench 主题、可视化分类色);`.mobile-route-*` 兜底迁移。
- **下一步**: **LOOP-45 = 第六批下一组** 或 **UI-5 开源 Showcase**;UI-6 / BUG-7 等所有者决策。

## 2026-10-26 · LOOP-43 · UI-1 第六批(第二组):小说工作台散落状态色

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: 第六批按分批策略推进 —— 迁移小说工作台 6 个组件的散落状态色(64 处)。
- **改动**:批量 hue→semantic 映射(rose/red→destructive、emerald/green→success、amber→warning、sky→info),alpha 变体优先替换避免前缀截断;同时 rounded-2xl→rounded-lg:
  1. `OutlineTab`:缺角色/提示警告框、成功提示 → warning/success;
  2. `StructuredChapterListCard`:3 处待生成/待细化警告 → warning;
  3. `CharacterDynamicsSection` `riskTone`:高风险→destructive、警告→warning、提示→info;
  4. `TimelinePanel`:危险/注意/正常 → destructive/warning/success;
  5. `ChapterExecutionReferencePanel`:质量债务提示框 → warning;
  6. `CharacterOverviewTab` `StatusPanel`:四种统计 tone → success/info/destructive/warning(保留绿=好、蓝=中、红=坏、黄=注意的语义)。
  复扫 6 文件:**0 残留、0 畸形类名**。
- **验证**: client typecheck 0 错误;守卫 `statusColorContracts` 扩至 9 文件 3 条通过;client **268/268**。server 未动。
- **发布说明**: 状态色一致性细微改进,按规则跳过(与 UI-2 主题层一起验收)。
- **残留**: 第六批其余分组(NovelCoverDialog 75 处含生成封面调色、NovelStyleRecommendationCard 等);UI-6(promptWorkbench 主题、可视化分类色);`.mobile-route-*` 兜底迁移。
- **下一步**: **LOOP-44 = 第六批下一组** 或 **UI-5 开源 Showcase**;UI-6 / BUG-7 等所有者决策。

## 2026-10-26 · LOOP-42 · UI-1 第六批(启动):全站验收扫描 + 状态组件色迁移

- **类别**: UI / 流程(设计系统落地;主对话执行)
- **目标**: UI-1 第六批「全站一致性验收」—— 先扫描量化,再按安全分组逐批迁移。
- **全站扫描结论**:181 处 hex + 990 处调色板色,**并非全部可机械替换**:
  - `promptWorkbench` 6 文件 137 处 hex = 自定义绿色编辑器主题(40+ 色阶)→ 属 UI-6 同类设计决策;
  - 可视化画布(关系图/世界图谱/紧张度)节点色 = 分类色 → 与 UI-6 同源;
  - 其余为散落状态色 → 可安全分组迁移。
  已在 rollout 第六批加分批说明,避免后续盲目全站扫描。
- **改动(本轮安全分组:小说工作台状态组件)**:
  1. `ChapterExecutionStatusFlow`:进行中→info、完成→success;
  2. `PipelineTab`:完成态→success、失败态→destructive、缺角色提示→warning、错误文案→text-destructive,圆角 rounded-2xl→rounded-lg;
  3. `BookPayoffLedgerCard`:逾期→warning、已兑现→success、failed 保持中性→muted(不升级为 destructive,保持原意图);
  4. 守卫 `statusColorContracts.test.js`(2 条:三组件无调色板残留 + 语义正确)。
- **计划纠偏**:rollout 阶段状态 第四批/第五批 由「待开始」改为**完成**(LOOP-38 / 39-41 实际已交付)。
- **验证**: client typecheck 0 错误;守卫 2/2;client **267/267**。server 未动。
- **发布说明**: 状态色一致性细微改进,按规则跳过(与 UI-2 主题层一起验收)。
- **残留**: 第六批其余分组(散落状态色逐组)、需决策项(promptWorkbench 自定义主题、可视化分类色 = UI-6)、`.mobile-route-*` 兜底迁移(独立工程)。
- **下一步**: **LOOP-43 = 第六批下一组状态色** 或 **UI-5 开源 Showcase**;UI-6 / BUG-7 等所有者决策。

## 2026-10-26 · LOOP-41 · UI-1 第五批:章节编辑器圆角与状态色收敛

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第五批剩余 —— 章节编辑器收敛圆角、状态块;`story-modes` 资产库化审计。
- **审计结论**:
  - `story-modes`:**上游已达标** —— `StoryModeManagementPage` 已是「推进模式库」(树形浏览 + 新建/扩展/编辑/删除),技术字段在编辑弹窗内,页面无裸 JSON 字段;
  - 章节编辑器:圆角 34×rounded-2xl + 8×rounded-3xl(规范建议卡片 8px),状态/差异/选区用 rose/emerald/amber/sky 调色板与纯白底。
- **改动**(章节编辑器 6 文件):
  1. 圆角收敛:rounded-3xl / rounded-2xl → rounded-lg(卡片/面板统一 8px),浮动工具条同步;
  2. 状态色语义化:21 处(rose→destructive、emerald→success、amber→warning)+ 3 处选区/信息(sky→info)+ 1 处硬编码白底→语义;含 diff 高亮(增/删)、警告框、侧栏选中态、DOM 类名选区高亮(add/remove 两处同步);
  3. 守卫 `chapterEditorVisualContracts.test.js`(2 条:禁 rounded-3xl/2xl/白底/调色板 + 断言语义色使用)。
- **验证**: client typecheck 0 错误;守卫 2/2;client **265/265**。server 未动。
- **发布说明**: 章节编辑器圆角与状态配色与全站一致,深浅主题自适配,细微改进,按规则跳过(与 UI-2 主题层一起验收)。
- **UI-1 第五批完成**:帮助页(39)、预览页(40)、章节编辑器(41);story-modes 审计达标;chat-legacy 仅兼容维护。
- **残留**: UI-1 第六批(全站一致性验收);UI-6 / BUG-7 等所有者决策。
- **下一步**: **LOOP-42 = UI-1 第六批(全站一致性验收)** 或 **UI-5 开源 Showcase**。

## 2026-10-25 · LOOP-40 · UI-1 第五批:预览页阅读进度与编辑器推荐

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第五批 —— 小说预览补齐阅读进度与进入编辑器的推荐动作。
- **现状审计**: 预览页已有当前章节展示、章节目录、页脚"编辑本章"小按钮与头部工作区入口;缺**阅读进度**(现有 X/Y 是"已生成"进度,非读到第几章)与**突出的推荐动作**。
- **改动**:
  1. 纯函数 `previewReading.ts`:`buildReadingProgress`(当前章序/总章数 → 百分比、进度文案、封顶 100)+ `buildPreviewEditRecommendation` / `resolveRecommendationRoute`(有当前章 → 继续编辑第 N 章,否则进入工作区);
  2. 预览页标题下新增阅读进度条(进度 + 第 X 章/共 N 章 · 百分比)与居中推荐按钮(主行动 = 编辑当前章,次行动 = 打开工作区,主次按推荐类型互斥);
  3. 守卫 `previewReading.test.js`(4 条:进度计算、边界、推荐类型/路由、页面接入)。
- **验证**: client typecheck 0 错误;守卫 4/4;client **263/263**。server 未动。
- **发布说明**: 预览页新增阅读进度条与"继续编辑第 N 章"推荐按钮,用户可见,已记 release-notes/README(2026-10-25)。
- **残留**: UI-1 第五批剩余(`story-modes` 资产库化、章节编辑器圆角/侧栏收敛);chat-legacy 仅兼容维护。
- **下一步**: **LOOP-41 = UI-1 第五批剩余**(或 UI-5 开源 Showcase);BUG-7 / UI-6 仍等所有者决策。

## 2026-10-25 · LOOP-39 · UI-1 第五批:帮助页主题化(新手任务导航)

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第五批 —— `/help` 从硬编码深色 Hero 转为随主题适配的新手任务导航头。
- **审计结论**:`/help` 结构**上游已达标**(创作向导 Hero 由真实 journey 驱动 + 第一本书路线里程碑 + 可选增强 + 主行动推荐,已是任务导航而非营销 Hero)。真实缺口是 **Hero 硬编码**:`bg-[#122033]` 深色底 + 白字 + `sky` 装饰光斑,不随明暗主题;里程碑/完成态用 emerald/amber 调色板。
- **改动**:
  1. Hero 改为 `border-primary/15 bg-primary/[0.05]` 主题自适应表面,移除硬编码 hex 与装饰光斑(无渐变规范);徽标/文案/当前作品卡改语义 token;
  2. 里程碑状态 `border-success bg-success` / `border-warning bg-warning`,需处理行 `bg-warning/10`;完成态区块 `border-success/30 bg-success/10`;错误图标 `text-warning`;
  3. 守卫 `helpPageVisualContracts.test.js`(3 条:无硬编码色/任务导航结构/语义状态 token)。
- **验证**: client typecheck 0 错误;守卫 3/3;client **259/259**。server 未动。
- **发布说明**: 帮助页头部随明暗主题适配,深色模式不再出现突兀的固定深色横幅,用户可见,已记 release-notes/README(2026-10-25)。
- **残留**: UI-1 第五批其余(preview 阅读进度、story-modes 资产库、章节编辑器收敛)待后续;chat-legacy 仅兼容维护(不擅自删路由)。
- **下一步**: **LOOP-40 = UI-1 第五批其余**(或 UI-5 开源 Showcase);BUG-7 / UI-6 仍等所有者决策。

## 2026-10-25 · LOOP-38 · UI-1 第四批:短剧/漫画状态色语义化

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第四批 —— 短剧/漫画衍生页的状态色迁移到语义 token(深浅两套一致)。
- **审计结论**:
  - 结构项(项目库最近项目/下一步、项目页统一状态)**上游已达目标**:`DramaProjectPage` 已有 5 步进度条 + `DramaNextStepPanel` + 状态徽标,无需重复施工;
  - 颜色项分两类:**状态色**(完成/部分完成/警告提示/进度条)应迁语义 token;**分类 chip**(资产类型 costume/vehicle、事实类别 completed/revealed、性别、密度)用 sky/violet/amber/emerald 区分多个类别 —— 折叠成单一语义色会丢失区分度,**属设计张力,登记待决策(UI-6)**,本轮不动。
- **改动**:迁移 13 处无歧义状态色 —— 短剧进度勾选/质量勾选、漫画完成徽标与进度条、"部分完成/全部完成"、4 处警告提示条(短剧视频提示、漫画图片生成提示、分集提示、脸型强覆盖框),全部 `success/warning` 且移除 `dark:` 前缀(语义 token 自适配)。
- **守卫** `dramaComicStatusColors.test.js`(2 条):禁止 5 个状态专用调色板类名回退;断言语义 token 确实被使用。
- **验证**: client typecheck 0 错误;守卫 2/2;client **256/256**。server 未动。
- **发布说明**: 短剧/漫画状态色深浅主题一致,细微改进,按规则跳过(与 UI-2 主题层一起验收)。
- **残留**: UI-6(分类 chip 色彩体系待所有者/设计决策);UI-1 第四批结构项已达标。
- **下一步**: **LOOP-39 = UI-1 第五批(阅读/帮助/兼容页)** 或 **UI-5 开源 Showcase**;BUG-7 仍等所有者决策。

## 2026-10-25 · LOOP-37 · UI-1 `/style-engine` 结构终态(第三批收官)

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第三批唯一剩余 —— 编辑/应用测试/去 AI 味三态从 88vh/84vh 超大弹窗改为页面内常驻工作区。
- **改动**:
  1. `WritingFormulaPage` 三处 `<Dialog>` 容器替换为单个常驻 `<section>`:视图标题/描述 + editor/workbench/clean 切换 + 关闭按钮 + 对应面板(面板 props、mutation、状态全部不动);
  2. 视图元信息抽为 `WORKSPACE_VIEW_META`(文案原样迁移);
  3. 编辑视图仍挂 `editorDialogRef` 并复用 `useWritingFormulaDialogFocus`(焦点查询 data-* 契约不变);
  4. 创建流程 `WritingFormulaCreateDialog` 保留模态;
  5. 移除已无用的 Dialog 导入,改导 Button;守卫 `styleEngineWorkspaceStructure.test.js`(3 条:无超大弹窗/常驻工作区+视图切换/焦点契约+创建弹窗)。
- **验证**: client typecheck 0 错误;守卫 3/3;client **254/254**。server 未动。
- **发布说明**: 写法引擎编辑/应用/净稿改为页面内常驻切换,编辑态不再丢失上下文,用户可见,已记 release-notes/README(2026-10-25)。
- **UI-1 第三批全部完成**:A 写法视觉(LOOP-6)、B 设置 token(33)、C 世界卡引导(34)、D 路由分组(35)、结构验收(36)、style-engine 终态(37)。
- **下一步**: **LOOP-38 = UI-1 第四批(短剧/漫画衍生页)** 或 **UI-5 开源 Showcase**;BUG-7 仍等所有者决策。

## 2026-10-25 · LOOP-36 · UI-1 第三批结构验收与计划纠偏

- **类别**: UI / 流程(主对话执行)
- **目标**: 第三批剩余三处"结构"切片逐一验收 —— 判定是否真为缺口,避免重复施工;纠偏过期计划。
- **审计结论**(诚实核对,而非盲目施工):
  1. `/worlds/generator`:**已达目标** —— 上游实现为四步工作区(`WorldGeneratorStepOne/Two/Three` + `useState<1|2|3|4>` 状态机 + 前置禁用 + 返回上一步),非"单体大 Card";
  2. `/anti-ai-rules`:**已达目标** —— 已是「资产库(`AntiAiRuleList`)+ 工作区(生效预览/效果测试)」左列表右 420px 工作区两栏 + 编辑弹窗;
  3. `/style-engine`:**真实缺口** —— 编辑/工作台/净稿仍为 88vh/84vh 全屏弹窗,目标"常驻资产库 + 编辑工作区"未达,留独立一轮。
- **改动**:
  1. 新增守卫 `worldGenAndAntiAiStructure.test.js`(2 条),锁定 generator 多步结构与 anti-ai-rules 两栏结构,防止回退;
  2. 纠正 `product-ui-design-rollout-plan.md` 阶段状态(原写"结构对齐待做",实际前两处已完成,唯一剩余 style-engine 结构终态)。
- **验证**: 守卫 2/2;client 未改业务代码,沿用 LOOP-35 的 typecheck 0 错误 / 249/249。server 未动。
- **发布说明**: 纯结构验收与计划纠偏,无用户可见变化,按规则跳过。
- **残留**: UI-1 第三批唯一剩余 = `/style-engine` 结构终态(弹窗改常驻工作区,重构 M/L)。
- **下一步**: **LOOP-37 = UI-1 `/style-engine` 结构终态**(或按入口建议进入 UI-5);BUG-7 仍等所有者决策。

## 2026-10-25 · LOOP-35 · UI-1 第三批 D:模型路由按任务分组

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第三批 —— 模型路由页按「开书、规划、正文、审核、资料处理」组织,提升可读性与修复动作定位。
- **改动**:
  1. `modelRouteLabels.ts` 新增 `MODEL_ROUTE_GROUP_ORDER`(开书设定/规划推进/正文生产/审校把关/资料加工/灵感对话)+ `resolveModelRouteGroup` 纯函数;11 个任务类型全部归位,未知类型回退规划推进;灵感陪写单列以免语义错位;
  2. `ModelRoutesPage` 抽出 `renderRouteCard`,路由卡按分组顺序渲染,每组带标题与项数;
  3. 守卫 `modelRouteGroups.test.js`(5 条:全类型覆盖/语义归位/未知回退/具名分组存在/页面接入)。
- **验证**: client typecheck 0 错误;守卫 5/5;client **249/249**。server 未动。
- **发布说明**: 模型路由管理页按创作流程分组展示,用户可见,已记 release-notes/README(2026-10-25)。
- **残留**: UI-1 第三批剩余:`/worlds/generator` 分步工作区、`/style-engine` 结构终态、`/anti-ai-rules` 结构对齐。
- **下一步**: **LOOP-36 = UI-1 第三批剩余**,或按入口建议进入 UI-5 开源 Showcase。

## 2026-10-25 · LOOP-34 · UI-1 第三批 C:世界样本卡状态与下一步引导

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第三批 —— 世界样本列表显示「当前状态 / 可用于哪些创作步骤 / 推荐深化动作」,降低新手选择成本。
- **改动**:
  1. 新增纯函数 `client/src/pages/worlds/worldGuidance.ts` `resolveWorldGuidance`:按规则/势力/地点/关系四项资产数量分档状态(未整理/可起步/较完整)、推导可用创作步骤(正文生成/角色准备/卷战略/节奏拆章)、确定性下一步优先级(规则→势力→地点→关系→推送);
  2. `WorldList` 样本卡在计数行下新增引导区:状态徽标 + 可支撑步骤 + 下一步;
  3. 守卫 `worldGuidance.test.js`(5 条:全齐/空世界/优先级/步骤过滤/页面接入)。
- **验证**: client typecheck 0 错误;守卫 5/5;client **244/244**。server 未动。
- **发布说明**: 世界样本库卡片新增状态与下一步提示,用户可见,已记 release-notes/README(2026-10-25)。
- **残留**: UI-1 第三批剩余:`/worlds/generator` 分步工作区、`/style-engine` 结构终态、`/anti-ai-rules` 结构对齐、`/settings/model-routes` 组织。
- **下一步**: **LOOP-35 = UI-1 第三批剩余**(或按入口建议进入 UI-5 开源 Showcase)。

## 2026-10-25 · LOOP-33 · UI-1 第三批 B:设置页语义 token 收敛

- **类别**: UI(设计系统落地;主对话执行)
- **目标**: UI-1 第三批剩余 —— 设置模块硬编码色值迁移到语义 token,深浅两套主题一致。
- **改动**:
  1. `ProviderStatusCard`:可用徽标 `bg-emerald-600 text-white` → `bg-success text-success-foreground`;
  2. `SettingsReadinessCard`:就绪/检查/进行中/警告图标与文案 → `text-success`/`text-warning`/`text-info`;
  3. `ModelRoutesPage` `RouteStatusDot`:健康/失败/检查/空闲 → `bg-success`/`bg-destructive`/`bg-warning`/`bg-muted-foreground/40`;
  4. `AutoDirectorIssuePolicyCard`、`AutoDirectorPendingReviewAutoPromotionCard`、`ProviderConfigDialog`、`StyleEngineRuntimeSettingsCard`:8 处 amber 警示面 → `border-warning/40 bg-warning/10(/15) text-warning`;
  5. 复扫设置模块:**0 处**调色板残留。
- **验证**: client typecheck 0 错误;新增守卫 `settingsVisualContracts.test.js`(扫描设置模块全部 tsx,禁止调色板硬编码色/装饰渐变/纯黑白类名)1/1;client **239/239**。server 未动。
- **发布说明**: 视觉 token 迁移无交互变化,深色主题对比度提升属细微改进,按规则跳过(可与 UI-2 主题层一起验收)。
- **残留**: UI-1 第三批剩余:世界三页结构对齐、`/settings/model-routes` 组织、`/style-engine` 结构终态、`/anti-ai-rules` 结构对齐;之后第四~六批。
- **下一步**: **LOOP-34 = UI-1 第三批剩余的结构对齐**(或按入口建议进入 UI-5 开源 Showcase,S–M/P2)。

## 2026-10-25 · LOOP-32 · BUG-5 任务阶段词表中英混写收敛

- **类别**: 缺陷修复(主对话执行)
- **目标**: BUG-5 —— `NovelWorkflowTask.currentStage` 持久化值中英混写(多数写入点用中文标签,个别混入英文 key),步骤索引解析可能回落 0。
- **现状审计**:
  - 写入侧:绝大多数工作流写入点经 `stageLabel(...)`/`NOVEL_WORKFLOW_STAGE_LABELS` 持久化中文标签;唯一混入英文 key 的写入点是 `DirectorProductionExperienceService.ts`(`currentStage: "chapter_execution"`);
  - 读取侧:workflow detail 步骤由 `currentItemKey`/`checkpointType` 推导(不依赖 currentStage);list 路径展示 currentStage 作为标签回退;`resolveStageIndex` 按 key 匹配,中文标签命中失败回落 0。
- **改动**:
  1. `resolveStageIndex` 先按 key 匹配,未命中再按 label 匹配 —— 中文标签与英文 key 均可命中正确步骤索引,存量中英混写数据自动兼容;
  2. `DirectorProductionExperienceService` 写入改用 `NOVEL_WORKFLOW_STAGE_LABELS.chapter_execution`,写入点全部统一为中文标签;
  3. 守卫 `workflowStageVocabulary.test.js`(4 条:key 命中、label 命中、未知回落 0、写入点静态扫描无英文 key 混入)。
- **验证**: server build 0 错误;守卫 4/4;server 全量 **1457 / 1445 过 / 0 失败 / 12 跳过**。client 未动。
- **发布说明**: 运行记录的步骤显示一致性属用户可见修复,已记 release-notes/README(2026-10-25)。
- **残留**: 无(存量中英混写数据由读取侧兼容,无需迁移)。
- **下一步**: BUG 线仅剩 **BUG-7**(需所有者产品语义决策)。可转入 UI/OPS 线或等待决策。

## 2026-10-25 · LOOP-31 · BUG-6 + BUG-8 任务中心两处一致性修复

- **类别**: 缺陷修复(主对话执行)
- **目标**: BUG-6(拆书步骤词表缺口)与 BUG-8(混合视图隐藏行与 overview 计数不对齐)。
- **改动**:
  1. **BUG-6**:`BOOK_ANALYSIS_STEPS` 补齐 `loading_cache`(读取缓存)与 `generating_overview`(生成总览),步骤流改为 排队→读取缓存→提取笔记→生成总览→生成章节→收尾,与 `BookAnalysisStage` 全集一致;拆书中段 currentStage 不再回落到第 0 步;
  2. **BUG-6 产品语义核实**:draft 状态在拆书专属页面可见(`listAnalyses` 仅过滤 archived),archived 为用户显式归档动作、全站隐藏 —— 语义已明确,无需改;
  3. **BUG-8**:`parseLinkedPipelineJobId` 移入 `taskCenterVisibility`(单一来源);新增 `collectLinkedPipelineJobIdsFromRows` 供 overview 复用同一代理状态规则;`listTasks` 移除 kind=novel_pipeline 的隐藏旁路(两种视图同一条规则);overview 的 `generationJob.groupBy` 排除被代理行。
- **验证**: server build 0 错误;`bookAnalysisSteps` 守卫 2/2(词表覆盖全阶段 + buildSteps 索引正确)、`taskCenterVisibility` 守卫 4/4(含静态断言 overview 排除与无旁路);server 全量 **1453 / 1441 过 / 0 失败 / 12 跳过**。client 未动。
- **发布说明**: 运行记录的拆书中段进度与计数一致性属用户可见修复,已记 release-notes/README(2026-10-25)。
- **残留**: BUG-5(任务阶段词表中英分裂,M/P2,需独立一轮)、BUG-7(需所有者产品语义决策)。
- **下一步**: **LOOP-32 = BUG-5**(任务阶段词表统一)或按入口建议进入 UI/OPS 线。

## 2026-10-25 · LOOP-30 · BUG-3 + BUG-4 小项清理

- **类别**: 缺陷修复(主对话执行)
- **目标**: 合并清理两个最小 BUG 项:BUG-3(pnpm 配置迁移卫生)、BUG-4(移动端外观页路由登记缺口)。
- **改动**:
  1. **BUG-3**:删除根 `package.json` 的 `pnpm.onlyBuiltDependencies` / `ignoredBuiltDependencies` 块 —— pnpm ≥10 已改读 `pnpm-workspace.yaml` 的 `allowBuilds`(两处配置语义已等同),每次命令打印的 `[WARN] The "pnpm" field...` 消失;
  2. **BUG-4**:`MOBILE_ROUTE_PATTERNS` 补登记 `settings-appearance`(外观与主题,more 组);`index.css` 两个移动块补 `.mobile-route-settings-appearance` CSS 落点;导航测试 `routedPaths` 补 `/settings/appearance`。
- **验证**: client typecheck 0 错误;client **238/238**(导航合同含新路径);server 全量 **1448 / 1436 过 / 0 失败 / 12 跳过** 且输出无 pnpm WARN;pnpm 命令输出无 WARN。
- **发布说明**: BUG-4 用户可见(移动端外观页布局),已记 release-notes 与 README(2026-10-25);BUG-3 纯内部。
- **残留**: BUG-5/6(词表类,S–M)、BUG-7(需所有者产品语义决策)、BUG-8(任务视图计数,S)。
- **下一步**: **LOOP-31 = BUG-6**(拆书步骤词表缺口,S/P2)或 BUG-8;BUG-5/7 需要决策或更大改动,建议单独一轮。

## 2026-10-25 · LOOP-29 · BUG-10 comic 事实提取提示词迁入 prompting

- **类别**: 缺陷修复(主对话执行)
- **目标**: BUG-10 —— `ComicFactService.ts` 内联 PromptAsset 且 render 使用 `new SystemMessage`,违反 prompt 治理守卫(`prompting-governance.test.js` integration 失败)。
- **改动**:
  1. `factExtractionPrompt`(含 Schema/类型)迁入 `prompting/prompts/comic/comic.prompts.ts`(BUG-10 迁移;资产 `id: comic.factExtraction`、`version: v1`、任务/模式/上下文预算逐字保留);
  2. 注册表登记 `comic.factExtraction@v1`(与资产 `id@version` 一致,BUG-9 规则);
  3. `ComicFactService` 移除内联提示词与 Schema,改为从 prompting 导入资产,服务逻辑(取数、摘要构建、fire-and-forget、写库)不变。
- **事故与纠正**: 迁移时误以为 `prompting/prompts/comic/` 不存在而覆盖了既有的 `comic.prompts.ts`(内含 episodeOutline/panelScript/visualAnchorRewrite 三个资产,上游已完成前两个的迁移)。通过 `git checkout HEAD --` 恢复后改为追加合并,并验证162 个注册键全部一致、无坏链。教训:新建家族目录前先核既有文件,写覆盖前先 grep 导出。
- **验证**: server build 0 错误;注册键全量扫描 **162 键 0 不一致 0 加载失败**;`prompting-governance` + `comicDecoupling` + `prompting.test` + `promptCatalog` **61/61**;server 全量 **1448 / 1436 过 / 0 失败 / 12 跳过**。client 未动。
- **发布说明**: 内部治理修复,无用户可见变化,按规则跳过。
- **残留**: 无。governance integration 模式恢复全绿。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-30 = BUG-3/BUG-4 等剩余 BUG 项(按 P 排)**,随后 UI/OPS。

## 2026-10-25 · LOOP-28 · BUG-9 注册键与资产版本对齐

- **类别**: 缺陷修复(主对话执行)
- **目标**: BUG-9 —— `promptAssetLoaderEntries` 的注册键落后于资产实际版本,导致 `getRegisteredPromptAsset` 对旧键返回 null、`prompting.test.js`(integration 模式)失败。
- **现状审计**: LOOP-27 修复 `prompting.test.js` 后暴露第二处失败,进而全量扫描 161 个注册键,发现 **8 处** 不一致(上游资产升版后注册键未同步):`novel.character.castOptions`(v2→v3)、`novel.chapterHook.generate`(v1→v2)、`novel.character.castAuto`(v1→v2)、`novel.character.castAuto.members`(v1→v2)、`novel.character.supplemental`(v1→v2)、`novel.create.resource_recommendation`(v1→v2)、`style.detection`(v1→v2)、`style.rewrite`(v1→v2)、`novel.world.generate_from_theme`(v2→v3)。
- **改动**:
  1. 注册键全部对齐到资产实际 `id@version`;
  2. `prompting.test.js` 断言同步更新(castOptions v3、supplemental v2);
  3. 无任何程序化调用引用旧键(已核),旧键在水合时本就被重映射删除,更新为纯修复。
- **验证**: server build 0 错误;全量扫描 **161 键 0 不一致**;`prompting.test.js` **49/49**;`prompting-governance` + `promptWorkbench` 中 governance 有 1 条**既有**违规(`ComicFactService.ts:39` 内联 SystemMessage,上游 comic 提交引入,登记 BUG-10,与本轮无关);server 全量 **1448 / 1436 过 / 0 失败 / 12 跳过**。client 未动。
- **发布说明**: 内部注册表修复,无用户可见变化,按规则跳过。
- **残留**: BUG-10(comic 内联提示词违规)待处理。
- **下一步**: **LOOP-29 = BUG-10**(把 comic 事实提取提示词迁入 prompting 注册表或纳入允许集)。

## 2026-10-24 · LOOP-27 · RF-1 第八个文件(最后一个):`promptRunner.ts`

- **类别**: 重构(行为不变;主对话执行;RF-1 收官)
- **目标**: RF-1 —— 拆分 `server/src/prompting/core/promptRunner.ts`(1264 行,提示词执行核心)。
- **拆分方案**:
  1. `promptRunnerState.ts`:可覆盖 LLM 工厂/结构化调用器状态、访问器与测试注入函数;
  2. `promptRunnerHelpers.ts`:纯工具(渲染上下文、调用元信息、错误分类、语义重试消息);
  3. `promptRunnerTelemetry.ts`:完成/失败记录、流式捕获、结果组装;
  4. `promptRunnerStructured.ts`:结构化解析、后校验、语义重试循环;
  5. `promptRunnerExecutors.ts`:执行准备与四个执行器;
  6. `index.ts` 显式门面;原文件保留兼容门面。
- **关键陷阱与修复**:既有测试用就地赋值注入桩(`promptRunner.runStructuredPrompt = stub`),`export *` 的 CJS getter 绑定不可写,赋值静默失效 → 桩失效、真实 LLM 调用触发、多文件测试以不同错误信息失败(chapterPatchRepair/bookAnalysis/repairStream/pipelineRuntime 等)。stash 对照证实 HEAD 通过、未修复拆分失败;**根因归属本轮**。修复:门面改用显式 `export const`(可写属性),就地替换恢复生效。教训已记 wiki。
- **验证**: server build 通过;`chapterPatchRepair` 桩注入回归 **11/11**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**;client 未动沿用 LOOP-19 结论。另发现 integration 模式既有失败(`novel.character.castOptions@v2` 注册键与资产 v3 不一致,上游遗留),登记为 BUG-9,与本轮无关。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **RF-1 整项完成(8/8)**:`worldStructure.ts`、`worldVisualization.ts`、`world.prompts.ts`、`ChapterArtifactDeltaService.ts`、`comicRoutes.ts`(同轮达成 RF-2)、`novelDirectorTakeover.ts`、`RagIndexService.ts`、`promptRunner.ts`,全部行为不变、全量通过。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-28 = BUG-9 / RF 后按 P 排的 BUG 项**(见入口建议)。

## 2026-10-24 · LOOP-26 · RF-1 第七个文件:`RagIndexService.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/rag/RagIndexService.ts`(1242 行,RAG 索引核心服务)。
- **拆分方案**:
  1. `ragIndexChunking.ts`:纯分块逻辑(`isCjk`、`normalizeRagPreChunks`、`buildRagChunkCandidates`、`buildRagContextualDocumentMap`);
  2. `ragIndexSourceLoading.ts`:`buildJoinedText`、`loadRagSourceDocuments`(prisma 读取,注入 `normalizeRagPreChunks`);
  3. `ragIndexEmbedding.ts`:`embedRagTextsInBatches`(接收 `EmbeddingService` 参数);
  4. 服务文件保留队列管理、进度快照、`upsertOwnerChunks`/`deleteOwnerChunks` 编排、`syncKnowledgeDocumentIndexStatus`。
- **行为约束**:并发配置、进度上报阈值(3%)、事务边界不变;公共 API(`RagIndexService` 构造签名、`RagJobCancelledError`、`RagJobProgressSnapshot`、`RagJobSummaryRecord`)不变;`prisma.ragIndexJob` 字符串保留在服务文件。
- **验证**: server build 通过;定向 `ragChunking`/`ragContextualChunk`/`ragJobListing`/`knowledgeServiceStatus`/`ragCompatibilityBootstrap` **18/18**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 1 个文件(`promptRunner.ts`)。
- **下一步**: **LOOP-27 = RF-1 第八个文件(最后一个)**。

## 2026-10-24 · LOOP-25 · RF-1 第六个文件:`novelDirectorTakeover.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/novel/director/runtime/novelDirectorTakeover.ts`(1158 行,导演接管决策/就绪模块,纯函数无 IO)。
- **拆分方案**:
  1. `takeoverTypes.ts`:共享类型 + 阶段/入口元信息;
  2. `takeoverInput.ts`:种子素材判定、构思/候选、`buildDirectorTakeoverInput`;
  3. `takeoverSnapshot.ts`:资产快照就绪谓词;
  4. `takeoverMapping.ts`:阶段/入口/工作流映射与 `buildSkipSteps`;
  5. `takeoverPlan.ts`:执行延续、阶段计划、自动执行计划、`resolveDirectorTakeoverPlan`;
  6. `takeoverReadiness.ts`:各步骤就绪度、预览、`buildDirectorTakeoverReadiness`、`assertDirectorTakeoverPhaseAvailable`;
  7. `takeoverBookSpec.ts`:`buildTakeoverBookSpec`;
  8. `index.ts` 显式门面只导出原公共 API;原文件保留兼容门面。
- **行为约束**:判断阈值、文案、跳步语义、计划解析逻辑逐行搬运;门面只导出原公共 API,内部谓词与元信息不外泄;保持纯函数(无 IO、无状态)。
- **验证**: server build 通过;定向 `novelDirectorTakeover` + `directorTakeoverExecutionContract` **17/17**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 2 个文件(`promptRunner.ts`、`RagIndexService.ts`)。
- **下一步**: **LOOP-26 = RF-1 第七个文件**。

## 2026-10-24 · LOOP-24 · RF-1 第五个文件:`comicRoutes.ts`(同轮达成 RF-2)

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/modules/comic/http/comicRoutes.ts`(1071 行,64 条路由);同轮覆盖 RF-2(comicRoutes HTTP 层拆分)。
- **拆分方案**:
  1. `comicRouteSchemas.ts`:跨领域共享的参数与请求体 Schema;
  2. `comicRouteContext.ts`:模块级服务单例(`ComicProjectService` / `ComicEpisodePlanService` / `ComicPanelScriptService`);
  3. 8 个领域注册器(每文件一个 `registerXxx(router)`):项目/剧集/事实、分镜脚本、角色与立绘、分镜图片与气泡、成片导出、批量任务、角色资产、场景;
  4. `comicRoutes.ts` 降为 23 行入口,按**原注册顺序**调用注册器,保持 `export default router`。
- **行为约束**:路由路径/方法/校验/处理函数体逐行搬运,不改业务逻辑;服务实例仍为模块级单例;领域内专用 Schema 留在注册器文件。
- **验证**: server build 通过;路由数量守卫 **HEAD 64 条 vs 拆分后 8 文件合计 64 条**;`comicDecoupling` **2/2**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 漫画为实验特性的内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 3 个文件(`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`)。
- **下一步**: **LOOP-25 = RF-1 第六个文件**。

## 2026-10-24 · LOOP-23 · RF-1 第四个文件:`ChapterArtifactDeltaService.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/novel/runtime/ChapterArtifactDeltaService.ts`(1302 行,章节生产核心链路)。
- **拆分方案**:
  1. `artifactSync/chapterArtifactDelta.shared.ts`:共享类型、角色解析/知识边界/账本键/上下文文本工具、角色名册、章节引用解析、`assertExpectedChapterContentInTransaction` 版本守卫;
  2. `artifactSync/chapterArtifactPayoffConsumer.ts`:`applyPayoffDeltas` 伏笔账本增量消费者(显式函数);
  3. 服务文件保留公共类型/消费者枚举、提取与分发编排、摘要/快照/角色资源/动态/知识/心智/对话影响与 RAG 队列;
  4. `mergeKnowledgeBoundaryState` 继续由服务文件 re-export,外部公共 API 不变。
- **行为约束**:`CHAPTER_ARTIFACT_CONSUMERS` 顺序、事务边界、`expectedChapterContent` 栅栏、伏笔 `manualLocked` 语义与错误信息均未改动。
- **验证**: server build 通过;定向 `chapterRuntimeCoordinator` **14/14**;全量首跑发现 `payoffLedgerMvp` 静态守卫仍读旧文件,已改指伏笔消费者模块;修正后 server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 4 个文件(`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-24 = RF-1 第五个文件**。

## 2026-10-24 · LOOP-22 · RF-1 第三个文件:`world.prompts.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/prompting/prompts/world/world.prompts.ts`(1312 行,含 14 个 PromptAsset)。
- **拆分方案**:
  1. `world.prompts/worldReference.prompts.ts`:参考灵感、概念卡、概念卡本地化;
  2. `world.prompts/worldOptions.prompts.ts`:属性选项、深挖问题;
  3. `world.prompts/worldGeneration.prompts.ts`:分层生成/本地化、结构回填、主题世界、结构分区、公理建议;
  4. `world.prompts/worldQuality.prompts.ts`:可视化、一致性、导入抽取;
  5. `world.prompts/worldPromptHelpers.ts`:参考方式标签、宽松对象清洗;
  6. `world.prompts/index.ts`:显式门面;原文件保留兼容门面,注册表与业务导入路径不变。
- **行为约束**:14 个资产的 `id/version/taskType/mode/contextPolicy/outputSchema/render` 均未改动;注册表仍按原路径加载。
- **验证**: server build 通过;全量套件首跑发现 `powerSystemPreference.test.js` 静态守卫仍读取旧文件,已将守卫指向承载提示词的 `worldGeneration.prompts.ts`;修正后 server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 结论。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 5 个文件(`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-23 = RF-1 第四个文件**。

## 2026-10-23 · LOOP-21 · RF-1 第二个文件:`worldVisualization.ts`

- **类别**: 重构(行为不变;主对话执行)
- **目标**: RF-1 —— 拆分 `server/src/services/world/worldVisualization.ts`(1082 行)。
- **拆分方案**:
  1. `worldVisualization/shared.ts`:类型、上限常量、方向坐标、势力类型别名、关系标签、文本/JSON 工具、`makeId`/`normalizeTextField`;
  2. `worldVisualization/faction.ts`:势力节点/边推断与归一化、自由文本势力抽取、力量层级、时间线;
  3. `worldVisualization/geography.ts`:方向/坐标/区域/路线归一化、地理节点/边归一化与地图构建;
  4. `worldVisualization/payload.ts`:结构化优先、自由文本兜底、LLM 草稿清洗、公共入口;
  5. `worldVisualization/index.ts`:显式门面,仅导出原公共 API;原文件保留兼容门面。
- **边界**:`shared ← faction`、`shared ← geography`、`faction/geography/shared ← payload`,无循环;结构化优先与兜底顺序不变。
- **验证**: server build 通过;定向 `worldVisualization/worldStructure/storyWorldSlice/bookFraming` **18/18**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与基线一致)。client 未动,沿用 LOOP-19 typecheck 0 错误 / 238/238。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过。
- **残留**: RF-1 剩余 6 个文件(`world.prompts.ts`、`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-22 = RF-1 第三个文件**。

## 2026-10-23 · LOOP-20 · RF-1 大文件拆分(首个:`worldStructure.ts`)

- **类别**: 重构(行为不变;主对话执行)
- **目标**: BACKLOG RF-1 —— 一次拆一个超过 1000 行的文件,测试守护行为不变。本轮拆分 `server/src/services/world/worldStructure.ts`(1311 行)。
- **拆分方案**:
  1. `worldStructure/shared.ts`:常量、`WorldStructureSource`、JSON/文本/ID/去重/规则文本工具、空结构构造器;
  2. `worldStructure/normalize.ts`:全部归一化函数 + `parseWorldStructurePayload`;
  3. `worldStructure/legacy.ts`:旧字段种子生成、旧字段文本构建、`applyStructuredWorldToLegacyFields`、`buildWorldStructureOverview`(总览消费旧字段文本构建器,放在这里避免循环);
  4. `worldStructure/projection.ts`:仅 `buildWorldBindingSupport`;
  5. `worldStructure/index.ts`:显式门面,只导出原公共 API;原 `worldStructure.ts` 保留一行兼容门面,外部导入路径不变。
- **边界**:依赖方向 `shared ← normalize ← legacy`、`shared ← projection`、`legacy → projection`(仅 apply 默认参数),无循环;不从业务代码深引用内部文件;不新增泛化 `utils` 目录。
- **验证**: server build 通过;定向 `worldStructure/worldVisualization/storyWorldSlice/bookFraming` **18/18**;server 全量 **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(与 LOOP-19 基线一致)。client 未动,沿用 LOOP-19 typecheck 0 错误 / 238/238。
- **拆分过程修正**(静态检查发现):跨文件工具需显式导出;`normalizeLocation` 需导出给 legacy;归一化 metadata 需引入 `WORLD_STRUCTURE_SCHEMA_VERSION`;总览若留在 projection 会与 legacy 形成循环,已移入 legacy。
- **发布说明**: 纯内部重构,无用户可见变化,按规则跳过发布说明与 README。
- **残留**: RF-1 剩余 7 个文件(`world.prompts.ts`、`ChapterArtifactDeltaService.ts`、`promptRunner.ts`、`RagIndexService.ts`、`novelDirectorTakeover.ts`、`worldVisualization.ts`、`comicRoutes.ts`)。
- **下一步**: **LOOP-21 = RF-1 第二个文件**,优先选职责边界清晰的 `world.prompts.ts` 或 `worldVisualization.ts`。

## 2026-10-23 · LOOP-19 · 批量生成吞吐优化(INN-D3)

- **类别**: 创新/性能(D 线成本与效率;主对话执行)
- **目标**: BACKLOG INN-D3 —— 批量生成吞吐优化。
- **现状审计**: 章节正文/摘要/事实/状态有严格前序依赖,自动导演按章串行;节奏段章节列表携带前段摘要,按 beat 串行;拆书角色已有 worker pool(并发 3);导演候选书名补强已 `Promise.all`;唯一安全且明显的串行缺口是**角色外显资料批量生成** —— 逐角色 `await`,每个角色独立读取上下文并调用一次结构化模型。
- **改动**:
  1. 新纯函数 `characterVisibleProfileBatch.ts`:`runCharacterVisibleProfileBatch` 有界并发(默认 3)、slot 回填保证结果/跳过项按输入顺序返回、单项失败隔离;
  2. `generateBatchVisibleProfiles` 改为复用批次函数,移除串行循环;
  3. 边界:不并行章节生产链/节奏段章节列表;不绕过 provider requestLimiter;
  4. wiki `workflows/batch-generation-throughput.md`、计划 `docs/plans/batch-throughput.md`、发布说明性能条目。
- **验证**: server **1448 测试 / 1436 过 / 0 失败 / 12 跳过**(新增 4 条:并发上限与顺序、失败隔离、自定义并发/空列表、接线);client typecheck 0 错误、**238/238**。测试观测 maxActive = 3,完成顺序反转时结果仍按输入顺序。
- **验收对照**: 「批量生成吞吐优化」= 独立批量任务串行改有界并发,等待约降至 1/3(受限速影响);顺序与失败语义不变;章节链保持串行。
- **残留**: 批次层预加载共享小说上下文、动态并发配置不做;真实耗时收益待所有者实测。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-20 = RF-1 大文件拆分(首个文件,行为不变)**。

## 2026-10-23 · LOOP-18 · 本地模型离线跑审校与摘要(INN-D2)

- **类别**: 创新(D 线成本与效率;主对话执行)
- **目标**: BACKLOG INN-D2 —— 补 Ollama 兼容层,让审核/摘要可离线跑。
- **现状审计**: Ollama 兼容层主体已存在 —— 免密钥内置厂商、默认 `127.0.0.1:11434/v1`、模型目录优先 `/api/tags` 并回退 `/models`、工厂以 `"ollama"` 占位密钥、结构化输出固定 `prompt_json`、RAG 嵌入候选含本机模型,且已有单测。缺口是最后一公里:模型路由页没有"审校/摘要离线跑"入口,免密钥厂商的文案仍提示配置 API Key。
- **改动**:
  1. 模型路由页「本机跑审校与摘要」预设:纯函数 `LOCAL_OFFLINE_TASK_TYPES`(review/light_review/critical_review/summary)+ 本机厂商筛选 + 草稿构建(温度 0.3);按钮只填草稿、提示确认后保存,不影响正文/修复/重规划;
  2. 免密钥文案:厂商状态卡对 `requiresApiKey=false` 改为提示启动本地服务/选择模型,余额区域说明本机模型不需要余额;
  3. 修复兼容缺陷:本机 Qwen 模型(如 `qwen3:8b`)此前仅凭模型名被归入 `custom_openai_compatible_qwen`,现在先归入 `ollama` 家族;
  4. wiki `architecture/model-selection.md`、计划 `docs/plans/local-model-offline.md`、发布说明与 README。
- **验证**: server **1444 测试 / 1432 过 / 0 失败 / 12 跳过**(新增 3 条守卫);client **238/238**(新增 4 条);双端 typecheck 0 错误。新增守卫首跑即捕获 Qwen family 误判,修复后通过。
- **验收对照**: 「补 Ollama 兼容层」= 既有能力审计 + 守卫测试固定 + 分类缺陷修复;「审核/摘要可离线跑」= 一键预设 + 保存后四类任务走本机。
- **残留**: 原生 `/api/chat` 协议、自动拉取模型、自动探测本机服务、自动切换路由不做;正文生成不建议用本机模型(上下文窗口小);UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-19 = INN-D3 批量生成吞吐优化(M/P3)**。

## 2026-10-22 · LOOP-17 · 全链路 token 预算与成本报表(INN-D1)

- **类别**: 创新 + 功能收束(D 线成本与效率;主对话执行)
- **目标**: BACKLOG INN-D1 —— 把拆书的 token 预算守卫扩展到生产链;每本书出成本报表。
- **现状审计**: 拆书已有 `BookAnalysisBudgetGuard`;自动导演有固定单步/单章异常阈值;LOOP-11 已有按书成本报表 API 但无前端入口;缺可配置的本书预算与用户可见报表。
- **改动**:
  1. 预算配置 `AppSetting.llm.production_token_budget`(`defaultTokens` + 按书覆盖),服务 `ProductionTokenBudgetSettingsService`;解析优先级本书覆盖 > 全局默认,非法值按未设置;
  2. 用量与判定 `ProductionTokenBudgetService`:累计取 `LlmUsageEvent` 按 novelId 求和;严格大于才算超限;读取失败按未设置处理,不误停主链;
  3. 章节边界拦截:`resolveUsageCircuitBreaker` 增加本书预算检查;超限以 reason `token_budget_exceeded` 打开熔断(问题码 `runtime.token_budget_exceeded`,恢复动作 `resume_after_review`),只暂停不删除内容;
  4. 端点 `GET/PUT /api/production-budget/:novelId`;成本报告端点保持只读;
  5. 前端生产看板 `ProductionCostPanel`:近 30 天费用概览 + 任务前列 + 累计用量/预算输入;未定价模型明确提示;超限提示恢复方式;
  6. 共享契约 `shared/types/costControl.ts`(成本报告类型迁入 + 预算设置/状态);计划、wiki、发布说明与 README。
- **验证**: server **1441 测试 / 1429 过 / 0 失败 / 12 跳过**(新增 7 条守卫);client **234/234**(新增 2 条);双端 typecheck 0 错误。途中修 1 处契约冲突:成本报告路由只读守卫拒绝预算 PUT,遂拆分独立 `production-budget` 路由。
- **验收对照**: 「预算守卫扩展到生产链」= 本书预算 + 章节边界熔断 + 可恢复;「每本书出成本报表」= 看板费用概览 + 既有报表 API。
- **残留**: 自动按预算切换路由、全局预算设置页、手动单章生成的预算拦截不做;UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-18 = INN-D2 本地模型(Ollama 兼容)接入(M/P3)**。

## 2026-10-21 · LOOP-16 · 规划变更保存前预览(INN-C3)

- **类别**: 创新 + UI(C 线交互与可视化;主对话执行)
- **目标**: BACKLOG INN-C3 —— 规划/章节修改先预览 diff 再落盘。
- **现状审计**: 章节 AI 改写(候选 diffChunks)、故事线/卷版本 diff、世界同步 diff 均已有预览;缺口是卷战略与节奏/拆章保存 —— 整份 `VolumePlanDocument` 草稿直接写入并创建新版本,保存前看不到会导致哪些卷/章节变化。
- **改动**:
  1. 纯 diff 模型 `components/structuredOutline/volumeWorkspaceDiff.ts`:按卷 id/章节 id 匹配,分类新增/移除/移动(章序或跨卷)/字段修改,中文标签 + 确定性排序,跨卷移动不重复计字段修改;
  2. 保存门禁 `usePlanningSavePreview` hook:卷战略与节奏拆章两个保存入口统一先算 diff;无基线或无改动直接保存,有改动先确认;页面只注入保存 mutation;
  3. 确认弹窗 `VolumeWorkspaceSaveDiffDialog`:汇总徽标 + 分组列表;节奏拆章说明"同步到章节执行区、已有正文保留、卷纲外章节不自动删除",卷战略说明会记录新规划版本;
  4. 新文件归入 `structuredOutline/` 责任目录;wiki `workflows/planning-change-preview.md` + 计划 `docs/plans/planning-change-preview.md`;发布说明与 README 用户可见条目。
- **验证**: client typecheck **0 错误**;client **232/232**(新增 3 条守卫:分类/跨卷/空基线、无改动、保存入口与弹窗装配);server 未动沿用 LOOP-13 全绿(1434/0)。途中修 1 处自写测试期望(总变更章节数漏算跨卷移除)。
- **验收对照**: 规划修改 = 保存前确认弹窗(本轮补齐);章节修改 = AI 改写候选 diff 与版本历史 diff(既有)。
- **残留**: 后端 diff 端点、自动修复、手动正文编辑 diff 不做;UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-17 = INN-D1 全链路 token 预算与成本报表(M/P2)**。

## 2026-10-21 · LOOP-15 · 生产看板(INN-C2)

- **类别**: 创新 + UI(C 线交互与可视化;主对话执行)
- **目标**: BACKLOG INN-C2 —— 章节状态、质量债务热点、卷进度一屏总览。
- **现状审计**: 小说详情接口的 Chapter 不含聚合状态/字数/债务;既有 `GET /novels/:id/simple-shelf` 已派生 8 态 status、wordCount 与 qualityDebt,`GET /novels/:id/volumes` 返回章序映射 —— 看板直接复用两个既有投影,零新增后端契约。
- **改动**:
  1. 纯聚合模型 `productionBoardModel.ts`(可单测):状态分布(8 态固定顺序含零项)、总字数/完成率、待处理章节(error → replan_required → quality_debt,同组按章序)、质量债务热点(按 issueCodes 数降序取前 5)、卷进度(章序映射,含未挂卷计数);
  2. 页面 `/novels/:id/production-board`(路由级懒加载):统计徽标 + 状态条形分布 + 待处理/债务热点双栏 + 卷进度,条目直达章节页;两数据源独立请求,卷进度失败不影响其余区块;
  3. 入口:小说工作区「项目工具」弹窗「打开生产看板」;
  4. 移动端合同(路由元数据/CSS 落点/导航测试);
  5. 发布说明与 README 用户可见条目;计划 `docs/plans/production-board.md`。
- **验证**: client typecheck **0 错误**;client **229/229**(新增 3 条守卫:聚合模型、路由/入口/装配含"不得回退详情接口"、移动端合同);server 未动沿用 LOOP-13 全绿(1434/0)。类型修正:初版误用详情接口的 Chapter(缺 status/wordCount/qualityDebt),typecheck 拦截后改为 simple-shelf + volumes。
- **验收对照**: 「章节状态、质量债务热点、卷进度一屏总览」= 看板三区块 + 头部统计,条目可直达处理位置。
- **残留**: 看板内编辑动作、跨书对比不做;UI 实测留所有者。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-16 = INN-C3 变更 diff 预览(S–M/P3)**。

## 2026-10-21 · LOOP-14 · 故事世界图谱前端渲染(INN-C1 次轮,整项完成)

- **类别**: 创新 + UI(C 线交互与可视化;主对话执行)
- **目标**: INN-C1 次轮 —— 把只读图谱投影呈成可交互页面;完成整项「可交互图谱」验收。
- **改动**:
  1. **图谱页** `/novels/:id/story-graph`(`StoryGraphPage`,路由级 `React.lazy`):标题/说明/统计徽标(角色/势力/地点/要素/关系)+ 加载、失败重试、空态引导、世界切片缺失警示;
  2. **画布** `StoryGraphCanvas`(**二次懒加载 chunk**,`@xyflow/react` 与样式仅在画布 chunk 引入,首屏零增量):四类节点语义 token 配色(primary/warning/info/muted)、关系边动画、节点拖动、点击节点显示摘要与 meta、图例 + 控件;
  3. **布局纯函数** `storyGraphLayout.ts`:确定性同心环(势力 150 → 角色 320 → 地点 480 → 要素 620),可单测;
  4. **入口**:小说角色工作区「关系」页签顶部新增「故事世界图谱」按钮(与仅角色的关系图互补);
  5. **移动端合同**:`MOBILE_ROUTE_PATTERNS` 新增 `story-graph`(小说分组,标题「故事世界图谱」)+ `index.css` 两个移动块补 CSS 落点 + 导航测试 routedPaths 更新;
  6. 客户端 API `getStoryWorldGraph` + queryKey;发布说明与 README 更新(本轮为用户可见新页面)。
- **验证**: client typecheck **0 错误**;client **226/226**(222 + 4 条新守卫:布局确定性/懒加载合同/路由与入口/移动端合同);server 本轮未动,沿用 LOOP-13 全绿(1434/0);视觉与交互验收(桌面+移动、明暗两套)按仓库规则留给所有者。
- **验收对照**: INN-C1「世界结构数据做成可交互图谱」达成 —— 数据底座(首轮)+ 可交互渲染(次轮);图谱为独立页面,不干扰主链页面。
- **残留**: UI 实测问题留待验收反馈;图谱编辑动作、时间线/地理子视图属后续可视化轮次(UI-3 队列)。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-15 = INN-C2 生产看板(M/P3)**;其后 C3 → D 线 → RF/BUG/UI/OPS。

## 2026-10-21 · LOOP-13 · 故事世界图谱投影(INN-C1 首轮)

- **类别**: 创新(C 线交互与可视化;主对话执行;**多轮项,本轮只做只读数据投影**)
- **目标**: BACKLOG INN-C1「世界结构数据做成可交互图谱」的数据底座 —— 小说级 角色×势力×地点 图谱投影 + 只读端点;React Flow 渲染次轮。
- **现状审计**: 世界维度已有 `WorldVisualizationPayload`(不含角色、非小说级);小说侧切片/关系阶段/势力轨迹/角色数据齐备;无小说级聚合图谱。
- **改动**:
  1. 共享契约 `shared/types/storyWorldGraph.ts`(节点 character/faction/location/element;边 character_relation/faction_membership;stats 含截断前总数与 truncated);
  2. 纯函数投影 `services/novel/state/storyWorldGraph.ts`:切片势力与轨迹势力按名称归一合并(切片优先)、仅当前关系阶段且双方存在、成员边取每角色×势力最新轨迹、节点≤200/边≤400 稳定截断并统计;
  3. 服务取数(角色/当前关系阶段/势力轨迹/切片 JSON safeParse 损坏回退)+ **只读端点** `GET /api/story-graph/:novelId`。
- **验证**: server **1434 测试 / 1422 过 / 0 失败 / 12 跳过**(新增 5 条:合并去重与边过滤、成员最新轨迹、上限截断与统计、切片解析回退、服务取数与 404、静态契约);client 未动沿用既往结论。无 schema 变更。途中修 3 个自写缺陷(笔误、两处夹具未产生预期有效边)。
- **验收对照**: C1 整体为「可交互图谱」;本轮交付数据底座与端点,次轮接 React Flow(懒加载、不新引依赖)后整项再打勾 ✅。
- **发布说明**: 内部端点(UI 未消费),按规则跳过并注明。
- **下一步**: **LOOP-14 = INN-C1 次轮(前端图谱渲染)**:小说页或世界工作区接入 `/api/story-graph`,React Flow 节点/边渲染 + 基础交互(缩放/点击节点查看摘要);随后 C2 → C3 → D 线。

## 2026-10-20 · LOOP-12 · 失败模式 → 恢复动作知识库(INN-B4)

- **类别**: 创新(B 线 Agent 架构;主对话执行)
- **目标**: BACKLOG「把常见暂停/失败原因沉淀为结构化 原因→恢复动作,自动导演恢复更聪明」。
- **现状审计**: 跟进层已有 11 个 reason→动作解析;结构化失败信号散落在 failureCode(14 码)、noticeCode(3 码)、章节 failureClassification(5 码);**无统一的知识注册表**,运行时/UI 无法据此给出统一恢复指引。
- **改动**:
  1. 共享契约 `shared/types/recoveryPlaybook.ts`(条目含 码/短名/原因解释/用户视角动作/模式/可重试)+ `UnifiedTaskDetail.recoveryGuidance` 可选字段;
  2. **注册表** `services/task/recoveryPlaybook.ts`:**20 条目**覆盖全部既有结构化码 + 人工恢复合成条目(`manual_recovery_required`)+ `unknown_failure` 兜底;解析优先级 = 人工恢复(最高,不被具体码覆盖)> failureCode > noticeCode > classification > 兜底 > null;纯确定性映射,零 LLM、零自由文本关键词判断;
  3. **接线**:`TaskCenterService.getTaskDetail` 唯一装饰点附加 `recoveryGuidance`(加法字段,适配器零改动);
  4. **只读目录端点** `GET /api/recovery-playbook`;
  5. 语义约束:质量提醒类 inspect+不可重试(质量债≠失败)、重规划类 replan、租约丢失 auto_retry、人工恢复不可重试。
- **验证**: server **1429 测试 / 1417 过 / 0 失败 / 12 跳过**(新增 4 条:词表覆盖+形状、优先级含反例、语义抽样、静态契约);client 未动沿用既往结论。本轮无 schema 变更。
- **验收对照**: 「结构化 原因→恢复动作」= 注册表+解析器;「恢复更聪明」= 任务详情统一携带指引(前端展示后置);人工恢复语义优先受测试保护。
- **发布说明**: 内部字段(UI 未消费),按规则跳过并注明。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-13 = INN-C1 故事世界图谱可视化(M–L/P2)**(可视化栈已定盘,需拆分多轮;首轮建议先做数据契约与只读图谱端点);其后 C2 → C3 → D 线。

## 2026-10-20 · LOOP-11 · 成本感知模型路由(INN-B3)

- **类别**: 创新(D 线成本与效率,与 B 线交叉;主对话执行)
- **目标**: BACKLOG「便宜模型跑规划/摘要/审核,强模型跑正文;配额感知;按任务类型可配策略」;验收 = 同一本书两种路由的成本对比可见(配合 INN-D1)。
- **现状审计**: `ModelRouteConfig` 已实现按任务类型路由;usageTracking 已按调用记录 taskType/novelId/token 但只聚合到任务行;**无按书流水表、无价格数据** —— 缺口 = 按书记账 + 价格 + 对比。
- **改动**:
  1. **`LlmUsageEvent` 表**(双 schema + 双迁移):按书 LLM 调用流水(novelId/taskType/provider/model/tokens/duration;无书上下文不写,设置页与预览不污染);
  2. **计量钩子**:`recordTrackedLlmUsage` fire-and-forget 写流水(失败吞掉);
  3. **价格配置** `ModelPricingSettingsService`(AppSetting `llm.model_prices`,`provider::model` → 每百万 token 输入/输出单价;非法条目跳过)+ 设置端点 `GET/PUT /api/settings/model-prices`;
  4. **成本报告** `ModelCostReportService`:纯函数 `buildCostReport` 按 taskType 聚合出「实际成本 / 当前路由成本 / 最便宜模型 / 最贵模型 / 节省额 + 未定价模型清单」;窗口默认 30 天(1-365 夹取);只读入口 `GET /api/cost-report/:novelId?days=30`;
  5. 明确不做:价格只影响报表,不自动切换真实路由(自动路由策略属后续);前端展示与 D1 报表后置联动。
- **验证**: server **1425 测试 / 1413 过 / 0 失败 / 12 跳过**(新增 7 条:价格解析/成本数学/对比报告/空窗口/取数窗口与 prisma-stub/保存校验/静态契约);client 未动沿用既往结论;双迁移对齐通过。途中修 2 个自写缺陷:Express5 params 类型(string[] 联合)需 String() 收敛、静态契约正则未允许换行;另自纠一处算错的测试期望(经济路由总量 0.247)。
- **验收对照**: 「同一本书两种路由成本对比可见」= 报告三列成本 + 节省额,API 可查;前端展示留后续。
- **发布说明**: 内部能力(API 无 UI),按规则跳过并注明。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-12 = INN-B4 失败模式 → 恢复动作知识库(S–M/P3)**;其后 C 线 → D 线。

## 2026-10-20 · LOOP-10 · 全链路 Trace 与决策回放(INN-B1)

- **类别**: 创新(B 线 Agent 架构;主对话执行)
- **目标**: 把分散的生成信号持久化为"每章为什么这么写"的结构化轨迹并支持只读回放(排障 + 可解释 Agent 展示点)。
- **现状审计**: 检索 trace(采样、无 chapterId)、提示词遥测(内存态)、gating decisions(仅进 package)、compressionLog(仅 console.debug)、审核/验收(已落库但分散)—— 无任何一处聚合持久化。
- **改动**:
  1. **模型** `ChapterGenerationTrace`(双 schema + 双迁移,纯新表;索引 novelId+chapterId+createdAt / novelId+chapterOrder;无级联关系);
  2. **压缩日志入场**:`GenerationContextPackage.contextCompressionLog`(dropped/summarized/usedTokens/budgetTokens),装配器把既有 `buildCompressionLog` 结果同时写入 package(此前仅 console.debug);
  3. **轨迹服务** `chapterGenerationTraceService`:纯函数 `buildChapterGenerationTraceSections` 组装四段快照(context: gating 决策+压缩日志;generation: provider/model/temperature/runId;audit: 总分/各报告 issue codes/开放问题码/blocking;decision: 验收状态/repairability/decisionReason/failureCode/重规划建议)+ `record`/`list`;
  4. **定稿钩子**:`ChapterContentFinalizationService` fire-and-forget 写入,失败吞掉(诊断数据不得影响主链);
  5. **只读 API**:`GET /api/chapter-traces/:novelId/:chapterId`(最近 5 条,多行即多次生成/修复历史)。
- **验证**: server **1418 测试 / 1406 过 / 0 失败 / 12 跳过**(新增 4 条:四段组装、record/list prisma-stub 往返、钩子与路由只读静态契约、压缩日志字段);client 未动沿用既往结论;双迁移对齐测试通过。
- **验收对照**: 「任一已生成章节能查到为什么这么写的结构化轨迹」= 定稿即落轨迹 + 按章节只读查询,测试锁定;检索 trace 关联(需给 RagRetrievalTrace 加 chapterId)与前端回放 UI 后置。
- **发布说明**: 本轮为**内部能力**(轨迹目前仅接口可查,无用户可见入口),按发布说明规则显式跳过。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-11 = INN-B3 成本感知模型路由(M/P2)**;其后 B4 → C 线 → D 线。

## 2026-10-20 · LOOP-9 · 角色弧线追踪(INN-A4)

- **类别**: 创新(A 线长篇记忆;主对话执行)
- **目标**: BACKLOG「拆书已有角色形象演变;扩展到性格/目标/关系演变,生成时注入角色当前阶段状态」。
- **现状审计**: 拆书形象演变(`BookAnalysisCharacterAppearanceService`)、手动演进(`evolveCharacter`:bible+时间线+RAG → 更新性格/状态/目标并写 `CharacterTimeline`)、关系阶段(dynamics)、当前状态(local_state)均已在;**真实缺口 = CharacterTimeline 演变流水完全不参与正文生成**。
- **改动**: `character_arc` 层接入分层记忆管道 —— 纯函数 `buildCharacterArcEvents`(每角色最近 3 条、截断、缺章序兜底);装配器取 `characterTimeline`(≤30 行)分组写入 `characterArcEvents`(package/writeContext 双 schema,旧数据兼容);writer 新块(priority 90,full 模式且参与者有数据才渲染,提示"延续此轨迹,不要凭空重置人设");requirements+preferredGroups 登记;provider contract 遥测(>3 章评估、degrade)。MVP 边界:evolveCharacter 仍手动触发(自动演进涉及新 LLM 调用与配额决策,留后续);关系演变沿用 dynamics 阶段不另建块。
- **验证**: server **1414 测试 / 1402 过 / 0 失败 / 12 跳过**(新增 4 条:分组/限量/兜底、writer 登记、块与装配静态契约、gating 行为);client 未动沿用 LOOP-6 结论。途中修 2 个自写缺陷:zod record 需显式键类型、测试内 readSource 路径拼接。
- **验收对照**: 「生成时注入角色当前阶段状态」= character_arc(轨迹)+ local_state(当前状态)+ dynamics(关系)三层共同构成,测试锁定;演进自动化与漂移实测留后续轮次。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-10 = INN-B1 全链路 Trace 与决策回放(M/P2)**;其后 B3 → B4 → C 线 → D 线。

## 2026-10-20 · LOOP-8 · 分层递归记忆(INN-A3 章→卷→全书)

- **类别**: 创新(A 线长篇记忆;主对话执行)
- **目标**: 落地 roadmap「长程上下文记忆」—— 卷摘要 + 全书状态快照稳定参与后段生成;验收:后段生成上下文含分层摘要。
- **现状审计**: 章层已有(摘要 + `recent_chapters` **仅全局最近 3 章**);卷层只有计划期 mission;**canonical 时间线只喂 PlannerService,正文 writer 收不到**。缺口 = 卷内滚动回顾 + 全书时间线快照两层。
- **改动**:
  1. `GenerationContextPackage`/`chapterWriteContextSchema` 增加 `volumeRecap`、`bookStateSnapshot`(可选默认 [],旧数据向后兼容);
  2. 新纯函数模块 `runtime/context/layeredMemoryContext.ts`:卷定位(`resolveCurrentVolumeChapterOrders`)、卷内回顾格式化(当前章之前 ≤8 条、截断 100 字)、全书快照(时间线过滤未来事件、按章序取最近 8 条);
  3. `GenerationContextAssembler` 单点装配:当前卷章序 → 查卷内 `chapterSummary`(≤8)→ 两字段写入 contextPackage;
  4. `buildChapterWriteContext` 映射(仿 previousChaptersSummary 模式);`chapterContextBlocks` 新增 `book_state_snapshot`(priority 91)/`volume_recap`(priority 89)两块,`mode==="full"` 且非空才渲染;
  5. writer 资产 `contextRequirements` 登记两组 + 进 `preferredGroups`(防预算静默丢弃,吸取 A1-G2 教训);
  6. provider contract 增两条(stages=write、章序>3 才评估、degrade 语义)—— 提供注入遥测(吸收 A1-G8 教训)。
- **验证**: server **1410 测试 / 1398 过 / 0 失败 / 12 跳过**(新增 5 条:快照过滤/排序/截断、卷定位与回顾、writer 登记契约、块与装配静态契约、gating decisions 行为);client 本轮未动,沿用 LOOP-6 结论(typecheck 0 / 222)。中途修 1 个类型错误(canonical 时间线 `chapterOrder` 可 undefined → 参数类型放宽)。
- **验收对照**: 「后段上下文含分层摘要」= writer 必达登记 + 门控 + 装配,测试锁定;「抽样对比漂移减少」= 真实生成对比,留所有者实测。
- **遗留**: review/repair 模式未注入两层(本轮只保 writer,按 MVP);记忆条数/预算微调依据 `ctx-budget` 日志;wiki 已沉淀(rag/knowledge-and-context-assembly)。
- **下一步**: 按 BACKLOG 顺序 → **LOOP-9 = INN-A4 角色弧线追踪(M/P3)**;其后 B1 决策回放。

## 2026-10-20 · LOOP-7 · 全书一致性守卫(INN-A2)

- **类别**: 创新(A 线写作质量;主对话执行)
- **目标**: 章节生成后对**时间线矛盾、角色动机违背、世界规则冲突**做结构化校验,输出接入既有问题治理链(复用统一治理动作,执行器零新增分支)。
- **现状审计**(避免重复造轮子):通用审校 `audit.chapter.full` 已注入角色状态/世界规则/最近章节等上下文,确定性时间线检查器只覆盖窄类;真实缺口 = 无三类矛盾的显式检查协议、无专用问题码、无确定性后处理、无链路级契约测试。
- **改动**:
  1. **审校 prompt v2→v3**:system message 新增「一致性守卫」协议 —— 三类必查(时间线/动机/世界规则)操作性定义;强制专用码 `continuity_timeline_conflict`/`continuity_motivation_conflict`/`continuity_world_rule_conflict`;evidence 必须引用被违背的具体事实(角色目标原文/规则条文/时间线事件),禁止空证据;severity 分级指引(影响后续执行→high/critical,仅本章读感→medium);注册表 key 同步 `@v3`(预算不变,addendum 按 id 挂载不受版本影响);
  2. **确定性后处理** `services/audit/continuityGuard.ts`:守卫码规范化 —— 同码同描述去重(保留更严重版本)、按严重度排序、单报告上限 5 条、丢弃空/占位证据;非守卫码透传排后;纯规范化不做二次语义判定;
  3. **接线** `AuditService.auditChapter`:审校报告组装处应用后处理,下游 openConflicts→运行时 openIssues→blocking/质量债→修复/重规划**全部复用现有链路**,不新增 LLM 调用、不新增执行器分支;
  4. 版本引用同步(prompting/promptWorkbench 测试、prompting README 示例)。
- **验证**: server **1405 测试 / 1393 过 / 0 失败 / 12 跳过**(新增 3 条:规范化行为含反例、v3 注册+协议契约、**治理链测试**——high→blockingIssueIds、medium→质量债继续、其它 high 仍阻塞的反证);client 本轮未动,沿用 LOOP-6 全绿(typecheck 0 / 222)。途中修 2 个自写测试缺陷:夹具缺 `acceptance.missingObligations`、去重键未考虑严重度(升级为"保留更严重版本"的正确语义)。
- **验收对照**:「构造矛盾场景能检出」= prompt 协议 + 专用码 + 取证要求(真实检出依赖模型,由所有者实际审校验证);「产出治理动作」= 链路测试证明 high→blocking→修复/重规划、medium→质量债。
- **遗留**: 检出质量依赖模型按协议输出,若模型不输出专用码守卫会静默退化为普通审校(已记 wiki 失效模式);跨章批量回溯重扫、A3 分层记忆等后续轮次。
- **下一步**: 按所有者 2026-10-20 指示「按 backlog 顺序执行」→ **LOOP-8 = INN-A3 分层递归记忆(章→卷→全书摘要树)**。

## 2026-10-20 · LOOP-6 · 写法引擎视觉收敛(UI-1 第三批 A)

- **类别**: UI(按用户要求全程主对话执行,未使用 Workflow)
- **目标**: 落地 rollout 计划第三批中写法引擎的视觉收敛 —— 清除调色板硬编码色、删除局部暗色 hack、收敛超大创建弹窗。
- **基线更正(审计结论)**: rollout 计划记载第一/二批已于 2026-07-14 完成,经代码复核**属实**(语义 token `success/warning/info` 存在、`components/assetLibrary/` 共享组件被知识库/题材/基础角色三页引用);BACKLOG UI-1 旧描述("第一批待做")已更正为「进行中」并列出第三批剩余。LOOP-6 实际执行的是第三批 A。
- **改动**:
  1. `writingFormula` 模块 11 个组件 + 页面根,**~300 处调色板硬编码色**全部迁移语义 token:text-slate→foreground/muted-foreground,背景→background/muted,border→border,sky→info、amber→warning、emerald→success、rose→destructive;反色块统一 `bg-foreground text-background(/xx)`;
  2. 删除 `index.css` 中 40 行 `.writing-formula-theme` 暗色 hack 块(语义 token 自带明暗适配)与 4 处装饰渐变、1 处装饰阴影;
  3. 创建写法弹窗收敛:`max-w-5xl`→`max-w-4xl`、`h-[min(780px,92vh)]`→`h-[min(720px,90vh)]`;功能型工作台弹窗保留;
  4. 顺带修正 1 处改口式文案(「已经放到…里」→ 直述设置位置);
  5. 新增守卫 `client/tests/styleEngineVisualContracts.test.js`(模块零调色板类/无主题 hack/弹窗尺寸,含文件覆盖断言);
  6. 同步更正 BACKLOG UI-1 与 rollout 计划阶段状态。
- **验证**: client typecheck **0 错误**;client **222/222**(219 + 3 条新守卫);server 未改动,沿用 LOOP-5 全绿结果(1395 测试 0 失败)。类名有效性经 Tailwind 3.4 源码实证(`hsl(var(--x))` 的 `/40` 修饰符会生成 `hsl(var(--x) / 0.4)`)。UI 观感验收(明暗两套 × 三种主题)按仓库规则留给所有者。执行期间平台 Bash 安全分类器曾持续限流,恢复后完成验证。
- **遗留**: 第三批剩余(世界三页状态/推荐动作、设置页 17 处色值与 model-routes 组织、style-engine 嵌套 Card 与「资产库+编辑工作区」结构终态、anti-ai-rules 结构对齐)仍挂 UI-1;第四/五/六批未开始。
- **下一步**: UI-1 第三批剩余(建议先世界三页,色值几乎干净、以结构对齐为主)。

## 2026-10-18 · LOOP-5 · 伏笔账本 MVP(INN-A1)

- **类别**: 创新(A 线写作质量与长篇记忆;先审计后补缺,非从零建)
- **目标**: 把伏笔账本从「AI 只写、用户只看」变成**可登记、可标记、有确定性逾期兜底、有最小提醒面**的一等创作资产(验收①②③④)。
- **审计结论**(Workflow 四路扫描 + 合成 + 对抗核实,26 条缺口全部 confirmed):上游基建完整(双 AI 写路径 + 注入通道 + 只读卡片),验收②已达成;①③用户侧缺失(无登记/无标记/入口门控错位误显"账本为空");④未达成(overdue 纯靠 AI 标记、无提醒通道)。计划:`docs/plans/payoff-ledger-mvp.md`。
- **改动**(本轮 11 项收敛,全部手工实现——三个实现 agent 撞 429 配额阵亡后由主循环完成):
  1. **登记**:`POST /novels/:id/payoff-ledger`(`manual_<uuid>` 键、sourceRefs=manual、初始 setup、不加锁)+ 卡片「新增伏笔」表单;
  2. **标记**:`PATCH`(已回收/放弃/重新打开)+ `manualLocked` 双 schema 双迁移(纯增量列);锁定项在对账 upsert、逐章增量、系统 stale/failed 标记三处不被改写;「重新打开」解锁交还 AI;
  3. **入口修复**:大纲页签门控补 `outline`(误显"账本为空"根因)+ 空态区分加载中/读取失败(可重试)/无数据;
  4. **紧急参照**:改为当前写作进度(选中章节 → 最后有正文章节 → 最后一章),不再恒取全书最后一章;
  5. **过窗读时升格**:pending-like 且 `targetEnd < chapterOrder` → 读时视为逾期(`isPayoffOverdueAtChapter` 唯一判定口);注入侧分类复用共享分类函数,消除双口径;
  6. **停滞扫描**:未终结且超 30 章未触碰 → `payoff_missing_progress` 合成问题;
  7. **回收计数**:canonical 快照携带 `payoffCounts`,运行时摘要 paidOff/failed 不再恒 0,totalCount 覆盖全部在册条目;
  8. **逾期降质量债**:合成 `payoff_overdue` 从 blockingIssueIds/blockingLedgerKeys 剥离(修复重跑不再被冻结逾期结论拖死,符合 completion-first);
  9. **增量守卫统一**:applyPayoffDeltas 复用 `sanitizePayoffLedgerSyncItem`(堵住"无窗口 overdue"从逐章增量漏入);
  10. **提醒面**:导演质量工件 overdue→stale 进「N 项需复核」;大纲「资产约束」子页逾期数徽标;
  11. **文案**:卡片标题/说明改用户视角,VolumeCard 改口文案清除;快照区标注「以伏笔台账为准」。
  - 守卫测试 `server/tests/payoffLedgerMvp.test.js`(升格/停滞/计数/锁定行为/路由静态/客户端合同,含反证用例)。
- **验证**: client typecheck **0 错误**;client **219/219**;server **1402 测试 / 0 失败 / 12 跳过**(含双迁移对齐测试);亲自三镜头审查通过(范围 22 文件全在计划内、无残留、锁定语义与 G4 语义逐行核对);中途修 1 个类型错误(statusReason 缺 `| null`)与 1 个我自己的断言写反(setup 参与升格是计划语义)。
- **遗留**:
  - 注入保底/排序调优、上下文遥测、窗口行内编辑、卡片筛选跳转、同步状态标记与重试入口、验收死字段接线、sync_stale 消费、双轨快照合并、Markdown 导出清单、planner 空账本回退摘要仍为 0 → 合并登记 INN-A1b;
  - 子 agent 审查再次因 429 配额(23:05 重置)不可用,由主循环等价替代;审计本身 58.7 万 token。
- **下一步**: UI-1 设计系统第一批(轮次入口建议第 6 项),或按所有者兴趣另选。

## 2026-10-17 · LOOP-4 · 统一任务投影契约(INN-B2)

- **类别**: 创新(B 线 Agent 架构工程,P0;含契约修正类修复)
- **目标**: 消除"后端真实状态 / 运行记录 API / 前端展示"三层漂移 —— 任一长链任务状态三处可对照,不一致由守卫测试拦截。
- **改动**:
  - **契约审计**(先行):Workflow 四路并行扫描(后端状态源/任务中心 API/前端消费/导演投影)→ 三方对照表合成 → 对抗核实,**17 条发现:7 confirmed / 5 partly / 2 refuted / 3 low**。计划文档 `docs/plans/task-projection-contract.md`(处置表 + 收敛设计)。
  - **收敛实现**(§4 全落地):
    1. pmr 统一投影:Pipeline/Image/Style/Book 四适配器输出 `pendingManualRecovery`(有列即出、无列不出),前端 tone 对任意 kind pmr=true 输出 danger「需要恢复」;
    2. 任务中心读路径去副作用:list/detail 不再隐式 heal 写库(heal 改显式 opt-in;follow-ups revalidate、写操作后归一化、启动/后台对账通道保留);
    3. 步骤区 pmr 语义:详情步骤在 pmr 时不再把当前步标 failed(改中性 queued,与「等待手动恢复」头部一致);
    4. displayStatus 中文化:"Failed with generation alerts" → 「存在待处理的质量提醒」;
    5. sourceRoute 单一构造器:`buildNovelWorkflowSourceRoute` 收敛任务中心与恢复候选两套路由(无目标回落 /tasks 深链,simple 体验统一 /novels/:id/simple);
    6. attentionCount 权威计数:overview 新增服务端「需要处理」计数(失败排除纯质量提醒码 + pmr + 重规划,与前端 isTaskMustHandle 逐码同口径),任务中心摘要卡与侧边栏徽标统一消费,删除本地双口径与死分支;
    7. cancelled 中性化:DirectorDisplayMode/DirectorDashboardMode/AITakeoverMode/NovelEditTakeoverState 全链新增 `cancelled`(「已取消」中性终态,不折入 failed、不提供恢复动作),首页 next-action 把 cancelled 与 failed 分离;
    8. 小说页本地映射守卫:novelEditAutomationStatus 输出词表锁定 ⊆ TaskStatus(防后端契约变更时前端静默漂移)。
  - **守卫测试**:`server/tests/taskProjectionContract.test.js`(§5 六条:统一契约字段+pmr 白名单、英文残留、sourceRoute 单一构造器、GET 无 heal、pmr 步骤非 failed、attentionCount 同口径)+ client 侧 pmr/词表守卫(client 测试 215→219)。
  - **执行方式记录**:审计与实现各用一个 ultracode Workflow;实现轮中 S1/S3 与三个审查 agent 撞 429 配额阵亡,S2/C1/守卫/验证存活;**剩余实现与全部三镜头审查由主循环手工完成**(S1 剩余、S3 全链、守卫留白、审查),等价完成 DoD。
- **验证**:
  - client typecheck **0 错误**;client **219/219**;server fast **1395 测试 / 0 失败 / 12 跳过**(全部为最终态全量重跑);
  - 审查(主循环亲自三镜头 + 一处疑点核实):attentionCount 与前端质量码口径逐一比对 —— workflow 行 failureCode 恒为 NOVEL_WORKFLOW_FAILED,质量码仅出现在 pipeline lastErrorType,服务端排除逻辑与前端一致,疑点排除;范围/红线/文案全过,无调试残留。
- **遗留**:
  - 挂起发现登记 BACKLOG:BUG-5(阶段词表中英分裂,INC-8)、BUG-6(拆书步骤词表缺口,INC-9)、BUG-7(命令入队清 pmr 需产品语义决策,INC-3)、BUG-8(混合视图隐藏与 overview 计数不对齐,INC-17);
  - INC-16(DirectorRuntime 四张执行面表本仓库无写入方)记入 wiki 失败模式,归属确认前无法在本仓库闭合验证;
  - waiting_approval 筛选在无该态的 kind 上恒空(INC-10/11)属设计性语义,记入 wiki 页面说明即可,不另设条目;
  - 子 agent 审查因 5 小时配额(2026-10-18 00:09 重置)未能执行,由主循环等价替代;后续大轮注意配额余量。
- **下一步**: LOOP-5 伏笔账本 MVP(INN-A1)。

## 2026-10-17 · LOOP-3 · 衍生工坊实验化(FEAT-1/2)

- **类别**: 功能收束(产品取舍已有所有者结论:2026-10-15 拍板漫画/短剧降级为实验特性)
- **目标**: 漫画/短剧降级为实验特性 —— 导航入口标注"实验"、设置总开关可隐藏、短剧明示模拟成片、公开文档标实验状态;主链 UI 不受干扰、既有功能不回退、路由始终可直达。
- **改动**:
  - **注册表与联动**:`client/src/config/experimentalFeatures.ts`(路径→特性映射,纯函数、storage 可注入)+ `client/src/hooks/useExperimentalFeatures.ts`(useSyncExternalStore,设置切换后侧边栏/移动端菜单同 tab 即时重渲染)。
  - **桌面侧边栏**:漫画/短剧 amber"实验"徽标(漫画 Beta 徽标替换);短剧入口从 `disabled`/"即将推出" 改为可用入口(移动端本就可用,两端一致);按注册表过滤被隐藏项,`disabled` 渲染分支保留但当前无使用者。
  - **移动端更多入口**:同路径过滤 + 实验徽标;**合同文件 `mobileSiteNavigation.ts` 未动**,既有导航合同测试不受影响。
  - **设置总开关**:系统设置 → 外观与主题 新增"实验特性"卡,"在导航中显示实验特性入口"总开关(默认开;关 = 隐藏两个入口;部分态按关呈现,打开统一显示)。
  - **短剧模拟成片提示**:新增 `DramaVideoNotice` 提示条挂载短剧工作台与项目页;文案为"默认使用模拟演示通道,未接入真实视频生成服务时不会产出真实视频"(经审查去掉绝对化表述,配置了 `DRAMA_VIDEO_HTTP_CREATE_URL` 真实通道的部署下仍准确)。
  - **文档**:public 两模块页 H1 后加"状态:实验特性"引用块;introduction/usage-guide/README 功能区标注实验状态;新 wiki 页 `docs/wiki/product/experimental-features.md` 沉淀"注册表 → 徽标/过滤 → 总开关 → 文档标注"规则链与"入口隐藏 ≠ 路由下线"等失败模式。
  - **测试**:新增 `client/tests/experimentalFeatures.test.js`(默认可见、损坏 JSON 回退、路径映射含子路径、注册表形状)。
  - **验证阶段发现并修复 1 个 LOOP-2 漏网陈旧断言**:`novelAutoDirectorProgressPanelQueryKeys.test.mjs` 仍断言 `dashboardView?.mode`,而源码早已演进 `dashboardViewForDisplay`(任务 failed/cancelled 时置空)—— 在 HEAD 上即失败,属测试陈旧,对齐后**单独提交**,不混入功能提交(对抗审查确认的唯一 medium 发现)。
  - **审查修正 3 处**(low):提示条与徽标 title 统一全角标点;短剧/文档/README 三处"未接入"绝对化表述统一为"默认使用模拟演示通道 + 未接入时不会产出真实视频"。
- **验证**:
  - 执行方式:ultracode Workflow(3 个互斥文件簇并行实现 → typecheck/client/server 验证修复循环 → 文案规则/回归合同/范围红线三镜头对抗审查,10 agent),会话中断一次后按 runId 断点续跑;
  - 最终:**client typecheck EXIT=0**;client 全量测试 **215/215 通过**(文案修正后复跑);server fast **1383 测试 / 0 失败 / 12 跳过**(本轮早前跑出,其后无 server 改动,按验证复用规则沿用);
  - 审查:6 条发现 → 对抗确认 1(范围外测试,已单独处置)+ low 5(标点×2、绝对化表述、范围外归属——均已处置);
  - UI 验收按仓库规则留给所有者:开关切换联动、徽标显示/隐藏、短剧提示条、明暗主题。
- **遗留**:
  - **client 测试基线口径**:全量为 **215**(`tests/*.test.js` + `src/**/*.test.mjs`),LOOP-1/2 记录的 92 只是子集,`.mjs` 部分未被计入——那个陈旧断言因此漏到本轮才暴露;今后 L3 一律以 `pnpm --filter @ai-novel/client test` 全量为准;
  - 移动端路由元数据未登记 `/settings/appearance`(→ 新登记 BUG-4);
  - 移动端更多菜单不含漫画入口(既有合同如此,漫画仅桌面入口);若要补齐属导航合同变更,另行排期。
- **下一步**: LOOP-4 统一任务投影契约(INN-B2)。

## 2026-10-16 · LOOP-2 · 套件绿化(BUG-1/2)

- **类别**: bugfix(真 bug 修复 + 架构脆弱点断环 + 陈旧测试对齐 + 测试基建)
- **目标**: 38 个失败测试(server 33 + client 5)全部清零,基线转绿,让后续每轮 L3 验证可信。
- **改动**:
  - **真 bug ×3(代码修复)**:
    1. `bookAnalysis.budget.ts`:token 预算从 read-modify-write 恢复为原子 `increment`(NULL 列一次性绝对值引导写),修复批量拆书并发丢计数(测试暴露 2≠4);
    2. `chapterArtifactDelta.prompts.ts`:`characterResourceDeltas` 补 `.max(8)`(此前仅 prompt 约束、schema 不设防);
    3. `bookAnalysisToolSchemas/Tools`:zod 类型经 `QualityDebtChapterAttribution` 下沉 schema 模块,工具文件不再 import zod(守卫测试意图成立)。
  - **架构脆弱点 ×3**:`NovelDirectorIdeaInspirationService` 归位 `director/idea/`(满足根目录边界守卫,2 处引用同步);`creativeHubContextResolvers` 服务层单例改调用时惰性加载(切断 prompting→services 循环依赖,修复 4 个文件的冷启动 "is not a constructor");`run-tests.cjs` fast 模式从单进程 require 全部文件改为 `node --test` 进程隔离(根治跨文件 require.cache 污染类失败)。
  - **陈旧测试 ×~22 文件**:按系统化分诊逐条对齐现行契约(方法改名 applyCharacter*Dialogue*、领域模型 proposal→dialogueInfluence、事件驱动替代直接重建、断点续跑钳制区间、审批审计批量化、展示目录 +world_setup、prompt v3、continue 枚举收敛等),每处都先对源码/git 历史确认"有意演进"再改测试;`novelPlanningService` events stub 补 `on()`。
  - **前端 ×4**:`index.css` 补 5 个移动端路由选择器;`TaskCenterFilterPanel` 恢复两行三列移动合同(显式定位 + md 释放 + xl order-last,激活态 data 属性驱动);两个导航/设置合同测试对齐 31 条现行元数据与独立 model-routes 页。
- **验证**:
  - server fast:`node scripts/run-tests.cjs fast` → **1383 测试 / 1371 过 / 0 失败 / 12 跳过,EXIT=0**(spawning 进程隔离);
  - client:`typecheck` 绿;`node --test` → **92 / 92 过,0 失败**;
  - UI 走查(任务筛选面板改动):移动 390×844 实测栅格 `[类型,状态,异常] / [keyword 207px 跨列,排序]` 两行 ✓;激活态 `rgba(239,68,68,0.1)` 底 + 红字 ✓;桌面 1440×900 模板 `[150,150,1fr,220px,auto]` 与视觉顺序 类型→状态→keyword→排序→异常 ✓;0 新增控制台错误(dev 换手期 tasks API 瞬断为旧进程占端口所致,恢复后 200)。
- **遗留**:
  - `dramaPipelineContract` 等仍向 require.cache 注入假模块且不还原 —— 进程隔离后无害,**勿回退单进程跑法**;
  - prompting→services 同类顶层依赖未全面排查 + rag/index 顶层实例化(→ RF-5);
  - BUG-3(pnpm 配置 WARN)未动(不在本轮范围);
  - 分诊决策"事件驱动取代 outline 阶段直接重建"基于移除提交(42732301)同批引入事件处理器 + 门禁显式排除该 reason 的证据链;若产品希望恢复逐章重建,需同时改 `shouldRebuildCharacterDynamics` 门禁与 outline 测试两处。
- **下一步**: LOOP-3 衍生工坊实验化(FEAT-1/2)。

## 2026-10-16 · LOOP-1 · 项目体检基线(BUG-0)

- **类别**: bugfix(体检 / 缺陷收集,本轮不修复)
- **目标**: 建立质量基线 —— 全量 fast 测试 + client typecheck/test + 主链冒烟,产出具体缺陷清单,让后续每轮验证有可信对照。
- **改动**: 无代码改动;BACKLOG BUG-0 标记完成,新增 BUG-1(server 33 失败)/ BUG-2(client 5 失败)/ BUG-3(pnpm 配置 WARN);轮次入口建议更新。
- **验证**:
  - **环境**:Node v24.14.0,Windows;git 工作区干净(仅本轮文档)。
  - **server fast 套件**:`pnpm --filter @ai-novel/server test` → **1383 测试 / 1338 过 / 33 失败 / 12 跳过**。失败全名单(33 条,散布 20 个文件):
    1. NovelExportService exports generated chapters as a knowledge document for diagnosis
    2. NovelReferenceService formats structured timeline nodes by phase
    3. RagRetrievalTracer writes sampled trace summaries without chunk text
    4. StyleRewriteService includes preview anti-ai rules in the repair prompt
    5. agent tool definitions keep zod declarations in dedicated schema modules
    6. artifact delta expires accepted influence proposals once their window has passed
    7. artifact delta only applies accepted influence proposals that are active in this chapter
    8. auto director auto-approval audit loads the latest 10 records per novel
    9. buildExportContent uses novel title plus timestamp as export filename
    10. buildPayoffLedgerResponse orders items by risk and computes summary counts
    11. chapter character context includes compact visible profile summary
    12. character mind persistence archives the old current snapshot before creating a replacement
    13. character resource extraction schemas cap resource deltas at eight items
    14. checkpoint: active running claim does not start another extraction
    15. continue_existing chapter takeover does not reuse the requested auto execution range
    16. director character phase applies an existing draft cast option without regenerating
    17. director planning stages expose standard node adapter contracts
    18. director root stays limited to compatibility facades
    19. display state keeps running mode when task is running despite stale approval projection
    20. display state maps chapter draft execution into chapter stage and uses fact progress
    21. drama service pipeline keeps repairable quality issues before storyboard and video tasks
    22. gateway delegates novel theme world generation through novel world service
    23. generateAllCandidates skips generated rows and processes failed candidates
    24. generateCharacterProfile transitions candidate to generated with arcs and scenes
    25. identifyCharacterCandidates dedupes candidates and keeps generated rows intact
    26. legacy generateCharacters identifies then generates profiles
    27. novel theme world prompt stays within a one-shot JSON budget
    28. novel workflow continue route accepts range and full-book continuation modes
    29. pipeline execution lease: non-schema claim failure does not pause a valid owner
    30. pipeline execution lease: ownership storage failure pauses before executor work
    31. runDirectorStructuredOutlinePhase persists chapter detail after each completed chapter
    32. runDirectorStructuredOutlinePhase resumes from the next incomplete chapter
    33. sanitizeStyleContextForGeneration redacts source entities before writer context
  - **client**:`pnpm --filter @ai-novel/client typecheck` **通过**;test → **92 测试 / 87 过 / 5 失败**:
    - every routed page has a route-specific mobile CSS landing point
    - mobile more menu contains all non-primary registered pages
    - mobile route metadata covers every registered page
    - mobile task filters stay in a compact three-column control grid
    - 设置路由提供四个独立页面并兼容旧模型路由链接(期望 model-routes 是重定向,代码已是独立页面)
  - **主链冒烟**:dev 环境 15 秒就绪(server :3000 health OK / client :5173 200)。Playwright 走查 7 页:`/`、`/novels`、`/tasks`、`/creative-hub`、`/auto-director/follow-ups`、`/comic`、`/settings` —— 全部正常渲染,**0 控制台错误**;API 全部 200(health、llm-selection、api-keys、quick-setup、follow-ups overview、tasks overview、knowledge documents、recovery-candidates)。两个 `/api/*` ERR_ABORTED 为页面导航中断、随即重试成功,不计缺陷;follow-ups overview ~3 秒轮询为设计行为,不计缺陷。
- **遗留**:33 + 5 条失败未分诊(→ BUG-1/BUG-2);pnpm WARN(→ BUG-3);冒烟只覆盖页面加载层,未触发真实生成链路(需 API 额度,留待真实创作时验证)。
- **下一步**: LOOP-2 套件绿化(BUG-1/2 分诊:真 bug 修码、陈旧测试更新、环境差异记档),使基线转绿。

## 2026-10-15 → 10-16 · LOOP-0 · 建立改进工作流(含 UI 工作线)

- **类别**: 流程
- **目标**: 为接手后的持续改进建立 loop engineering 工作流:循环协议、待办池、进度日志三件套。
- **改动**: 新增 `docs/workflow/improvement-workflow.md`、`docs/workflow/BACKLOG.md`、`docs/workflow/PROGRESS.md`。
  本轮同时沉淀已确认的战略决策:定位 = 个人开源作品 + 技术学习作品集 + 自用创作工具;漫画/短剧降级为实验特性(FEAT-1/2);与上游完全独立发展;创新覆盖 A/B/C/D 四条线。
  2026-10-16 补充(所有者要求丰富计划):新增前端 UI 改进工作线 —— BACKLOG 加 UI-1..5 五条(挂靠既有设计系统、rollout 分批计划、可视化栈定盘三份文档),工作流升 v1.1(轮次类别加 UI 类、L2 补 UI 规范、L3 补 client typecheck 与明暗/响应式走查要求),轮次入口建议加 UI 并行入口。
- **验证**: 文档自审(无占位符、backlog 条目均带验收标准、格式一致);纯文档改动不影响运行时,未跑测试。
- **遗留**:
  - ~~BACKLOG 首批优先级为建议值,待 LOOP-1 体检结果校准~~(已按 LOOP-1 结果校准,见轮次入口建议);
  - OPS-2(品牌/命名)待所有者拍板。
- **状态**: 已按 L5 提交(`f2a60f20`,2026-10-16)。
- **下一步**: LOOP-1 项目体检基线(BUG-0)→ 已执行,见上一条。
