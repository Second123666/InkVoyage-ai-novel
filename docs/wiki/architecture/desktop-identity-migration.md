# 桌面身份与数据目录迁移

## Background

桌面应用早期沿用了上游技术标识:`productName` 为 `AI Novel Writing Assistant v2`、`appId` 为 `com.ai-novel.desktop`、数据目录名为 `AI-Novel-Writing-Assistant-v2`。2026-10-28 起统一为「墨航 InkVoyage」,但已有本地数据不能因为目录名变化而看起来“消失”。

## Decision

1. 桌面标识跟随品牌:`productName` = `墨航 InkVoyage`,`appId` = `com.inkvoyage.desktop`,exe = `InkVoyage.exe`,数据目录 = `%LOCALAPPDATA%\InkVoyage`,更新缓存 = `inkvoyage-updater`。
2. 首次以新版启动时,如果新数据目录不存在或为空,把旧目录**复制**到新目录;旧目录保留,不移动、不删除。
3. 复制使用临时 staging 目录再重命名,避免半复制状态。
4. 新目录已有数据时不覆盖;显式设置 `AI_NOVEL_APP_DATA_DIR` 时跳过迁移;`AI_NOVEL_SKIP_DATA_MIGRATION=true` 可用于排障时跳过。
5. 迁移失败只记录日志并继续启动,不回滚、不阻塞;失败时旧目录仍完整可用。

## Current Rule

- 新目录:`desktop/src/runtime/paths.ts` 的 `APP_NAME = "InkVoyage"`。
- 旧目录候选:
  - `%LOCALAPPDATA%\AI-Novel-Writing-Assistant-v2`
  - `%APPDATA%\AI-Novel-Writing-Assistant-v2`
  - macOS `~/Library/Application Support/AI-Novel-Writing-Assistant-v2`
  - `~/.AI-Novel-Writing-Assistant-v2`
  - 便携版 exe 同级的 `AI Novel Writing Assistant v2-data` 与 `AI-Novel-Writing-Assistant-v2-data`
- 迁移入口:`desktop/src/main.ts` 在 `app.setPath("userData", ...)` 之前调用 `migrateLegacyDesktopDataDir()`。
- 迁移标记:`<新目录>/.inkvoyage-data-migration.json`;有标记时不重复迁移。
- 选择来源:优先包含 `data/dev.db` 的旧目录,否则取第一个非空旧目录。
- 便携版:新目录基于 `PORTABLE_EXECUTABLE_APP_FILENAME`;旧版中文/连字符目录名都在候选列表中。

## Examples

- 旧版安装在 `%LOCALAPPDATA%\AI-Novel-Writing-Assistant-v2`,新版首次启动 → 复制到 `%LOCALAPPDATA%\InkVoyage`,旧目录仍在。
- 用户已经用新版写过一章 → 新目录非空,跳过迁移,避免覆盖新数据。
- 测试或 CI 设置 `AI_NOVEL_APP_DATA_DIR=...` → 不迁移,使用显式目录。
- 复制中途失败 → 删除 staging,记录 `desktop.data-migration` 警告,启动继续。

## Failure Modes

- **只改 APP_NAME 不做迁移**:用户看到空书架;必须保留本页的复制逻辑。
- **直接移动旧目录**:旧版回滚或迁移失败时数据不可用;禁止移动/删除。
- **覆盖新目录**:新版已有数据被旧数据覆盖;必须先检查新目录是否为空。
- **复制中崩溃**:可能出现半复制;staging + rename 是硬约束。
- **appId 变化**:新版与旧版并排安装,旧更新通道不再沿用;这是一次身份切换,旧版保留用于回滚。

## Related Modules

- `desktop/src/runtime/dataDirMigration.ts`
- `desktop/src/runtime/paths.ts`
- `desktop/src/runtime/identity.ts`
- `desktop/src/main.ts`
- `desktop/tests/dataDirMigration.test.cjs`
- `server/tests/desktopIdentity.test.js`

## Source Documents

- `docs/workflow/PROGRESS.md` LOOP-66(2026-10-27)
- `docs/wiki/product/brand-and-identity.md`
