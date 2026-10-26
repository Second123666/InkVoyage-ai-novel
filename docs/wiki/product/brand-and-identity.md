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
4. 内部技术标识暂不跟随显示名,保持稳定以免破坏数据与更新通道:
   - workspace 包作用域 `@ai-novel/*`;
   - 桌面 `productName` / `appId`(`AI Novel Writing Assistant v2` / `com.ai-novel.desktop`);
   - `desktop/src/runtime/paths.ts` 的 `APP_NAME`(决定桌面数据目录)。
   若后续决定重命名这些标识,必须先设计用户数据目录迁移与更新通道切换方案,单独成轮。
5. 修改站点身份时同步检查三处: `site/vite.config.ts` 的 `base`、`site/index.html` 与 `site/public/404.html` 的 base 变量、`site/public/sitemap.xml` / `robots.txt` 的绝对 URL。
6. 发布说明与 README 只写用户可见名称;历史 release-notes 中的旧名保留,不追改历史。

## Failure Modes

- 只改 README 不改 UI/站点 → 品牌分裂(导航仍显示旧名)。
- 只改文案不改 Pages base path → 部署后静态资源 404。
- 修改桌面 `APP_NAME` / `appId` 而不做迁移 → 用户既有数据目录与更新通道失联。
- 新增外部链接时只改 owner 不改 repo/base → 链接仍落到上游或 404。

## Related Modules

- 身份链接:`README.md`、`client/src/components/layout/ProjectGithubLink.tsx`、`site/src/App.tsx`、`site/src/DocsPage.tsx`、`site/index.html`、`site/public/{404.html,robots.txt,sitemap.xml}`、`.github/workflows/*release*.yml`
- 归属声明:`NOTICE`、`LICENSE`、`CLA.md`、`docs/wiki/product/licensing-and-attribution.md`
- 上游独立项目:Ani Book Skill、ani-book-agent(仅在界面中作为外部项目推荐)

## Source Documents

- `docs/workflow/PROGRESS.md` LOOP-59(2026-10-26)
- OPS-2 / OPS-3 backlog 条目
