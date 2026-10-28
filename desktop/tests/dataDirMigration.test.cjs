const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { migrateLegacyDesktopDataDir } = require("../dist/runtime/dataDirMigration.js");

function makeTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "inkvoyage-data-migration-"));
}

function seedLegacyDir(legacyDir) {
  fs.mkdirSync(path.join(legacyDir, "data"), { recursive: true });
  fs.writeFileSync(path.join(legacyDir, "data", "dev.db"), "legacy-db");
  fs.writeFileSync(path.join(legacyDir, "data", "master.key"), "legacy-key");
  fs.mkdirSync(path.join(legacyDir, "storage", "generated-images"), { recursive: true });
  fs.writeFileSync(path.join(legacyDir, "storage", "generated-images", "cover.png"), "legacy-image");
}

test("首次启动把旧数据复制到新目录并保留旧目录", () => {
  const root = makeTempRoot();
  try {
    const legacyDir = path.join(root, "AI-Novel-Writing-Assistant-v2");
    const newDir = path.join(root, "InkVoyage");
    seedLegacyDir(legacyDir);

    const result = migrateLegacyDesktopDataDir({
      to: newDir,
      legacyDirs: [legacyDir],
      ignoreConfiguredDataDir: true,
    });

    assert.equal(result.migrated, true);
    assert.equal(result.from, legacyDir);
    assert.equal(fs.readFileSync(path.join(newDir, "data", "dev.db"), "utf8"), "legacy-db");
    assert.equal(fs.readFileSync(path.join(newDir, "data", "master.key"), "utf8"), "legacy-key");
    assert.equal(
      fs.readFileSync(path.join(newDir, "storage", "generated-images", "cover.png"), "utf8"),
      "legacy-image",
    );
    assert.ok(fs.existsSync(path.join(newDir, ".inkvoyage-data-migration.json")));
    assert.ok(fs.existsSync(path.join(legacyDir, "data", "dev.db")), "旧目录必须保留");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("已迁移过时跳过，不重复复制", () => {
  const root = makeTempRoot();
  try {
    const legacyDir = path.join(root, "legacy");
    const newDir = path.join(root, "InkVoyage");
    seedLegacyDir(legacyDir);

    const first = migrateLegacyDesktopDataDir({ to: newDir, legacyDirs: [legacyDir], ignoreConfiguredDataDir: true });
    assert.equal(first.migrated, true);

    const second = migrateLegacyDesktopDataDir({ to: newDir, legacyDirs: [legacyDir], ignoreConfiguredDataDir: true });
    assert.equal(second.migrated, false);
    assert.equal(second.reason, "already-migrated");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("新目录已有数据时不覆盖", () => {
  const root = makeTempRoot();
  try {
    const legacyDir = path.join(root, "legacy");
    const newDir = path.join(root, "InkVoyage");
    seedLegacyDir(legacyDir);
    fs.mkdirSync(path.join(newDir, "data"), { recursive: true });
    fs.writeFileSync(path.join(newDir, "data", "dev.db"), "new-db");

    const result = migrateLegacyDesktopDataDir({ to: newDir, legacyDirs: [legacyDir], ignoreConfiguredDataDir: true });
    assert.equal(result.migrated, false);
    assert.equal(result.reason, "new-data-exists");
    assert.equal(fs.readFileSync(path.join(newDir, "data", "dev.db"), "utf8"), "new-db");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("没有旧目录时保持新目录为空", () => {
  const root = makeTempRoot();
  try {
    const newDir = path.join(root, "InkVoyage");
    const result = migrateLegacyDesktopDataDir({
      to: newDir,
      legacyDirs: [path.join(root, "missing")],
      ignoreConfiguredDataDir: true,
    });
    assert.equal(result.migrated, false);
    assert.equal(result.reason, "no-legacy-data");
    assert.equal(fs.existsSync(newDir), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("显式配置的新数据目录不触发旧目录迁移", () => {
  const root = makeTempRoot();
  const previous = process.env.AI_NOVEL_APP_DATA_DIR;
  try {
    const legacyDir = path.join(root, "legacy");
    seedLegacyDir(legacyDir);
    process.env.AI_NOVEL_APP_DATA_DIR = path.join(root, "configured");

    const result = migrateLegacyDesktopDataDir({
      to: path.join(root, "configured"),
      legacyDirs: [legacyDir],
    });
    assert.equal(result.migrated, false);
    assert.equal(result.reason, "configured-data-dir");
  } finally {
    if (previous == null) {
      delete process.env.AI_NOVEL_APP_DATA_DIR;
    } else {
      process.env.AI_NOVEL_APP_DATA_DIR = previous;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
