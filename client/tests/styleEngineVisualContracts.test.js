import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// 写法引擎视觉合同守卫(LOOP-6 · UI-1 第三批 A · docs/plans/style-engine-visual-convergence.md)
// 规则:该模块统一使用语义 token,不允许再引入调色板硬编码色、装饰渐变或局部暗色 hack。

const moduleRoot = new URL("../src/pages/writingFormula", import.meta.url);
const moduleRootPath = fileURLToPath(moduleRoot);
const cssPath = new URL("../src/index.css", import.meta.url);

const PALETTE_PATTERN = /(?:slate|amber|emerald|sky|rose|indigo|violet|teal|cyan|orange|yellow)-[0-9]{2,3}(?:\/[0-9]+)?|bg-white|text-white|border-white|bg-\[(?:#[0-9a-fA-F]{3,8}|linear-gradient)/;

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

test("写法引擎模块不再使用调色板硬编码色或装饰渐变", async () => {
  const files = await collectTsxFiles(moduleRootPath);
  assert.ok(files.length >= 10, "应覆盖写法引擎的页面与全部组件文件");
  const offenders = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (PALETTE_PATTERN.test(source)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `以下文件仍含调色板硬编码色或装饰渐变,请改用语义 token(foreground/muted/success/warning/info/destructive):\n${offenders.join("\n")}`,
  );
});

test("index.css 不再保留 writing-formula-theme 暗色 hack", async () => {
  const css = await readFile(cssPath, "utf8");
  assert.doesNotMatch(
    css,
    /writing-formula-theme/,
    "语义 token 已自带明暗适配,局部 [class*=] 重映射必须删除",
  );
});

test("写法创建弹窗收敛为常规尺寸,不再使用 max-w-5xl", async () => {
  const dialog = await readFile(
    new URL("../src/pages/writingFormula/components/WritingFormulaCreateDialog.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(dialog, /max-w-5xl/, "创建弹窗不得回潮为超大尺寸");
  assert.match(dialog, /max-w-4xl/, "创建弹窗使用常规阅读宽度");
});
