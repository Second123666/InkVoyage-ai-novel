# 品牌与身份

## Background

2026-10-26 所有者将项目定名为「墨航 InkVoyage」(OPS-2)。此前仓库沿用了上游身份:README 的下载与介绍站链接、Trendshift 徽标、客户端 GitHub 入口、站点 canonical 与 Pages base 均指向上游仓库,与「与上游完全独立发展」的定位不一致,也会让用户下载到上游构建。

## Decision

- 产品显示名:**墨航 InkVoyage**;英文场景使用 **InkVoyage**。
- 自有仓库:`https://github.com/Second123666/AI-novel`;Gitee 镜像:`https://gitee.com/secondkiller/ai-novel`。
- 公开介绍站:`https://second123666.github.io/AI-novel/`(GitHub Pages,base path `/AI-novel/`)。
- 上游归属继续保留:NOTICE、README License 段、Ani Book Skill / ani-book-agent 链接保留,并明确标注为「上游作者维护的独立项目」。

## Current Rule

1. 用户可见的品牌文本统一为「墨航 InkVoyage」;导航、移动端头部、桌面窗口标题、客户端 HTML title、站点 meta 与结构化数据保持一致。
2. 项目身份链接指向自有仓库与 Pages;不得把上游 Releases/Pages 作为本项目的下载或介绍入口。上游链接只用于归属说明与上游独立项目推荐。
3. 上游徽标(如 Trendshift)不再展示;衍生关系只在 NOTICE/License/致谢中说明。
4. 桌面技术标识跟随品牌:
   - `productName`:`墨航 InkVoyage`;
   - `appId` / `AppUserModelId`:`com.inkvoyage.desktop`;
   - exe / 安装包:`InkVoyage.exe` / `InkVoyage-<version>-setup-x64.exe`;
   - 数据目录:`%LOCALAPPDATA%\InkVoyage`;
   - 更新缓存:`inkvoyage-updater`;
   - workspace 包作用域 `@ai-novel/*`、`AI_NOVEL_*` 环境变量、数据库文件名与 Qdrant collection 保持兼容,本轮不跟随改名。
   桌面数据目录变更必须通过 `desktop/src/runtime/dataDirMigration.ts` 在首次启动时复制旧数据;旧目录不删除,失败不阻塞启动。
5. 修改站点身份时同步检查三处: `site/vite.config.ts` 的 `base`、`site/index.html` 与 `site/public/404.html` 的 base 变量、`site/public/sitemap.xml` / `robots.txt` 的绝对 URL。
6. 发布说明与 README 只写用户可见名称;历史 release-notes 中的旧名保留,不追改历史。

## Failure Modes

- 只改 README 不改 UI/站点 → 品牌分裂(导航仍显示旧名)。
- 只改文案不改 Pages base path → 部署后静态资源 404。
- 修改桌面 `APP_NAME` 但不做数据迁移 → 用户看到空库;必须先复制旧目录并保留旧目录。
- 修改 `appId` 但不说明安装/更新影响 → 新版与旧版并排安装,旧更新通道不再生效;必须明确这是一次身份切换,旧版保留用于回滚。
- 只改 `icon-source.svg` 不重新生成产物 → 安装包、站点和 favicon 仍是旧图;必须运行图标生成脚本并核对产物清单。
- 新增外部链接时只改 owner 不改 repo/base → 链接仍落到上游或 404。

## Related Modules

- 身份链接:`README.md`、`client/src/components/layout/ProjectGithubLink.tsx`、`site/src/App.tsx`、`site/src/DocsPage.tsx`、`site/index.html`、`site/public/{404.html,robots.txt,sitemap.xml}`、`.github/workflows/*release*.yml`
- 桌面身份与迁移:`desktop/package.json`、`desktop/electron-builder.config.cjs`、`desktop/src/runtime/{identity.ts,paths.ts,dataDirMigration.ts}`、`desktop/scripts/{generate-desktop-icons.py,generate-social-preview.py,stage-desktop.cjs,verify-desktop-installer.cjs,verify-desktop-package.cjs}`
- 图标产物:`desktop/builder/`、`client/public/`、`site/public/`、`site/src/assets/`、`images/github/`
- 归属声明:`NOTICE`、`LICENSE`、`CLA.md`、`docs/wiki/product/licensing-and-attribution.md`
- 上游独立项目:Ani Book Skill、ani-book-agent(仅在界面中作为外部项目推荐)

## Source Documents

- `docs/workflow/PROGRESS.md` LOOP-59(2026-10-26)、LOOP-66(2026-10-28)
- `docs/wiki/architecture/desktop-identity-migration.md`
- OPS-2 / OPS-3 / OPS-6 backlog 条目
