import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// 设置页视觉合同守卫(LOOP-33 · UI-1 第三批 B · docs/plans/product-ui-design-rollout-plan.md)
// 规则:设置模块统一使用语义 token,不允许再引入调色板硬编码色、装饰渐变或纯黑白类名。

const settingsRoot = fileURLToPath(new URL("../src/pages/settings", import.meta.url));

const PALETTE_PATTERN = /(?:slate|amber|emerald|sky|rose|indigo|violet|teal|cyan|orange|yellow|red|blue|green|gray)-[0-9]{2,3}(?:\/[0-9]+)?|bg-white|text-white|border-white|bg-black|text-black|bg-\[(?:#[0-9a-fA-F]{3,8}|linear-gradient)/;

async function collectTsxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTsxFiles(fullPath));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

test("设置模块不再使用调色板硬编码色或装饰渐变", async () => {
  const files = await collectTsxFiles(settingsRoot);
  assert.ok(files.length >= 15, `应覆盖设置模块全部组件文件(实际 ${files.length})`);
  const offenders = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (PALETTE_PATTERN.test(source)) {
      offenders.push(file.replace(settingsRoot, "settings"));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `以下文件仍含调色板硬编码色,请迁移到语义 token(success/destructive/warning/info/muted):\n${offenders.join("\n")}`,
  );
});
