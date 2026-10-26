# 对外文档维护规则(README / docs/public / 文档站)

## Background

对外文档由四层组成:根 `README.md`(项目门面)、`docs/public/**`(用户向文档与流程深潜)、`site/src/docsManifest.ts`(文档站白名单与路由 id)、`docs/releases/release-notes.md`(完整更新历史)。2026-10 的 OPS-4 审校发现三类反复出现的失效:手写旧 slug 的站内链接、产品流程演进后未同步的说明、与 UI 不一致的术语(任务中心 / 新手上路),以及截图与当前界面脱节。

## Decision

- 对外文档保持「用户向 + 技术深潜」混合定位:模块页与手册讲用户能做的操作;`flow/` 下的技术文档可以保留源码路径与内部标识,但必须显式框定为开发者参考。
- 用机器守卫代替人工记忆:`pnpm check:docs-manifest` 同时校验文档登记、站内 `#/docs/<id>` 链接和自动导演阶段 key。

## Current Rule

1. **新增/删除/改名 `docs/public` 文档**:必须同步 `site/src/docsManifest.ts`;站内链接只能使用 manifest 的文档 id(`#/docs/<id>`),不得用文件名拼旧 slug。校验命令:`pnpm check:docs-manifest`。
2. **术语以产品 UI 为准**:任务中心对外称「运行记录」(只读,恢复动作回来源页面);新手入口称「创作向导」;漫画/短剧称「工作台」且标注实验特性。代码或 UI 改名时,同轮同步 `docs/public`、manifest 与 README,避免同一文档前后混用。
3. **产品流程变化必须全量同步**:如自动导演创建页收敛为「先完成导演准备 → 简易/专业创作」时,需同时更新 faq、usage-guide、end-to-end-production、auto-director-pipeline、first-novel-walkthrough 等所有承载该流程的文档;结论以 client 侧常量(`RUN_MODE_OPTIONS` / `DEFAULT_VISIBLE_RUN_MODE`)和页面实际文案为准,不凭记忆。
4. **release-notes 与 README 最新更新**:日期按实际交付日归属;同一天多条合并到同一日期块;README 只保留最新合并日期块 + 历史链接;纯内部改动(测试、重构、文档基建)跳过新增条目。发布说明写用户可见结果,禁止"不再/现在/已经"式过程叙述。
5. **截图是产品资产**:UI 改版后截图会过期;发现过期截图且无法立即重截时,先移除误导性图片,再登记刷新任务(参见 UI-8)。不得用旧截图配新文案。
6. **安全事实必须写进备份章节**:API Key 已加密落库,备份说明必须包含主密钥文件(默认 `data/secrets/master.key`)并与数据库成对备份。
7. **用户向页面不出现内部实现**:模块页与手册避免服务类名、队列表名、schema 字段、checkpoint 代码值;确需保留时改用页面可见说法。技术型 `flow/` 文档保留内部参考时,用「代码来源」「开发者参考」小节显式框定边界。
8. **站点构建入口**:`site/README.md` 记录了文档站构建、预览与 manifest 校验流程;新增公开文档后先跑校验再提交。

## Examples

- 新增一篇 `docs/public/modules/foo.md` → 在 manifest 的对应分组加 `doc("module-foo", "中文标题", "用户视角描述", "docs/public/modules/foo.md")` → 正文内互链写 `[示例](#/docs/module-foo)` → 跑 `pnpm check:docs-manifest`。
- 改 UI 名称「任务中心 → 运行记录」→ grep 全库文档与 manifest、README → 批量替换(图片文件名保持不动)→ 跑链接与 manifest 校验。
- 自动导演创建页模式调整 → 先读 client 代码确认现状 → 按上文第 3 条同步全部相关文档 → 删除旧模式截图。

## Failure Modes

- **新增文档未登记**:check 脚本报 "Missing from site/src/docsManifest.ts"。
- **站内链接手写旧 slug**:check 脚本报 "Links pointing to unknown #/docs ids",站点会静默回落到文档索引页。
- **只改代码不改文档**:术语/流程漂移,用户按文档找不到入口。
- **截图过期**:文档看起来仍指向已下线界面,比没有截图更误导。
- **release-notes 同日多块**:README 与历史页口径分裂;同一天必须合并。

## Related Modules

- 文档站:`site/src/docsManifest.ts`、`site/src/docsPage` / `site/src/docsContent.ts`、`scripts/check-docs-manifest.cjs`、`site/README.md`
- 发布说明:`docs/releases/release-notes.md`、`README.md` `## 最新更新`
- 维护任务:OPS-4(本轮审计)、UI-8(截图刷新)、OPS-2(身份链接与命名)

## Source Documents

- `docs/workflow/PROGRESS.md` LOOP-51(2026-10-26)
- `docs/workflow/improvement-workflow.md` §8 开源就绪清单
