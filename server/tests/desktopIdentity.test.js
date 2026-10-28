const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

test("桌面身份配置统一为墨航 InkVoyage", () => {
  const desktopPackage = readJson("desktop/package.json");
  assert.equal(desktopPackage.productName, "墨航 InkVoyage");
  assert.equal(desktopPackage.appId, "com.inkvoyage.desktop");
  assert.equal(desktopPackage.inkvoyage.appName, "InkVoyage");
  assert.equal(desktopPackage.inkvoyage.executableName, "InkVoyage");
  assert.equal(desktopPackage.inkvoyage.artifactBaseName, "InkVoyage");
  assert.equal(desktopPackage.inkvoyage.updaterCacheDirName, "inkvoyage-updater");
  assert.equal(desktopPackage.inkvoyage.shortcutName, "墨航 InkVoyage");
  assert.deepEqual(desktopPackage.inkvoyage.legacyAppNames, [
    "AI-Novel-Writing-Assistant-v2",
    "AI Novel Writing Assistant v2",
  ]);
});

test("electron-builder 从统一身份配置读取桌面标识", () => {
  const config = read("desktop/electron-builder.config.cjs");
  assert.match(config, /desktopPackage\.productName/);
  assert.match(config, /desktopPackage\.appId/);
  assert.match(config, /desktopPackage\.inkvoyage\?\.executableName/);
  assert.match(config, /desktopPackage\.inkvoyage\?\.shortcutName/);
  assert.match(config, /name: "inkvoyage"/);
  assert.match(config, /runAfterFinish: false/);
  assert.doesNotMatch(config, /AI Novel Writing Assistant v2/);
  assert.doesNotMatch(config, /com\.ai-novel\.desktop/);
});

test("桌面运行时与数据目录使用新身份并保留旧目录迁移", () => {
  const identity = read("desktop/src/runtime/identity.ts");
  assert.match(identity, /DESKTOP_PRODUCT_NAME = "墨航 InkVoyage"/);
  assert.match(identity, /DESKTOP_APP_ID = "com\.inkvoyage\.desktop"/);
  assert.match(identity, /DESKTOP_APP_NAME = "InkVoyage"/);
  assert.match(identity, /DESKTOP_LEGACY_APP_NAMES/);

  const paths = read("desktop/src/runtime/paths.ts");
  assert.match(paths, /const APP_NAME = DESKTOP_APP_NAME/);
  assert.match(paths, /resolveDesktopLegacyAppDataDirs/);

  const main = read("desktop/src/main.ts");
  assert.match(main, /migrateLegacyDesktopDataDir/);
  assert.match(main, /app\.setName\(DESKTOP_PRODUCT_NAME\)/);
  assert.match(main, /app\.setAppUserModelId\(APP_USER_MODEL_ID\)/);

  const serverPaths = read("server/src/runtime/appPaths.ts");
  assert.match(serverPaths, /const APP_NAME = "InkVoyage"/);

  assert.ok(fs.existsSync(path.join(repoRoot, "desktop/src/runtime/dataDirMigration.ts")));
});

test("打包、更新缓存与安装器校验使用新标识", () => {
  const stage = read("desktop/scripts/stage-desktop.cjs");
  assert.match(stage, /desktopPackage\.inkvoyage\?\.updaterCacheDirName/);
  assert.doesNotMatch(stage, /ai-novel-writing-assistant-v2-updater/);

  const installer = read("desktop/scripts/verify-desktop-installer.cjs");
  assert.match(installer, /desktopPackage\.inkvoyage\?\.executableName/);
  assert.match(installer, /expectedShortcutName/);
  assert.match(installer, /delete env\.ELECTRON_RUN_AS_NODE/);
  assert.doesNotMatch(installer, /AI Novel Writing Assistant v2\.exe/);

  const packageVerifier = read("desktop/scripts/verify-desktop-package.cjs");
  assert.match(packageVerifier, /app-update\.yml/);
  assert.match(packageVerifier, /updaterCacheDirName: inkvoyage-updater/);
});

test("图标源与生成产物齐全", () => {
  const source = read("desktop/builder/icon-source.svg");
  assert.match(source, /M48 16L70 50H48V16Z/);
  assert.match(source, /#5CC7D6/);
  assert.doesNotMatch(source, /M48 18L67 37L48 78L29 37/);

  for (const relativePath of [
    "desktop/builder/app-icon.ico",
    "desktop/builder/app-icon-512.png",
    "desktop/builder/app-icon.png",
    "client/public/favicon.ico",
    "client/public/apple-touch-icon.png",
    "client/public/web-app-icon.png",
    "site/public/favicon.ico",
    "site/public/favicon-32.png",
    "site/src/assets/app-icon.png",
    "images/github/project-social-preview-1280x640.png",
    "site/public/assets/project-social-preview.png",
  ]) {
    const target = path.join(repoRoot, relativePath);
    assert.ok(fs.existsSync(target), `缺少 ${relativePath}`);
    assert.ok(fs.statSync(target).size > 0, `${relativePath} 不能为空`);
  }
});
