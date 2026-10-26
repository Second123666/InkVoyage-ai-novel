import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// UI-1 第五批 · 章节编辑器视觉合同守卫(LOOP-41)
// 规则:圆角收敛到设计规范的 8px(cards/panels → rounded-lg),状态/选区/差异一律语义 token,
// 不得残留调色板色或纯白底(正文 prose 类名除外)。

const base = fileURLToPath(new URL("../src/pages/novels", import.meta.url));
const targets = [
  "components/chapterEditor",
  "NovelChapterEdit.tsx",
];

async function collectTsFiles(pathItem) {
  const full = join(base, pathItem);
  const stat = await import("node:fs").then((fs) => fs.promises.stat(full));
  if (stat.isFile()) return [full];
  const entries = await readdir(full, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    files.push(...await collectTsFiles(join(pathItem, entry.name)));
  }
  return files;
}

const FORBIDDEN = [
  "rounded-3xl",
  "rounded-2xl",
  "bg-white",
  "text-white",
  "border-white",
  "bg-[#",
];

const PALETTE = /(?:rose|emerald|amber|sky|red|green)-[0-9]{2,3}/;

test("章节编辑器圆角收敛到 8px 并使用语义 token", async () => {
  const files = (await Promise.all(targets.map(collectTsFiles))).flat();
  assert.ok(files.length >= 6, `应覆盖章节编辑器全部文件(实际 ${files.length})`);
  const offenders = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes("EDITOR_BODY_CLASS_NAME")) return;
      for (const token of FORBIDDEN) {
        if (line.includes(token)) {
          offenders.push(`${file.replace(/\\/g, "/").split("/novels/").pop()}:${index + 1} → ${token}`);
        }
      }
      if (PALETTE.test(line)) {
        offenders.push(`${file.replace(/\\/g, "/").split("/novels/").pop()}:${index + 1} → 调色板色`);
      }
    });
  }
  assert.deepEqual(offenders, [], `以下位置需改为 rounded-lg 或语义 token:\n${offenders.join("\n")}`);
});

test("章节编辑器确实使用语义状态与差异色", async () => {
  const files = (await Promise.all(targets.map(collectTsFiles))).flat();
  const joined = (await Promise.all(files.map((f) => readFile(f, "utf8")))).join("\n");
  assert.match(joined, /text-destructive|border-destructive/, "差异/错误用 destructive");
  assert.match(joined, /text-success|bg-success/, "成功/新增用 success");
  assert.match(joined, /text-warning|bg-warning/, "警告用 warning");
  assert.match(joined, /text-info|bg-info/, "选区/信息用 info");
});
