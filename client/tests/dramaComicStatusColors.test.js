import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// UI-1 第四批状态色守卫(LOOP-38)
// 规则:短剧/漫画页的状态色(完成/部分完成/警告提示/进度条)必须使用语义 token,
// 不得回退到具体调色板类名。分类用途的 chip(资产类型/事实类别/性别/密度)使用 sky/violet/amber
// 区分多个类别,属有意设计,不在本守卫范围(折叠成单一语义色会丢失类别区分度)。

const dramaRoot = fileURLToPath(new URL("../src/pages/drama", import.meta.url));
const comicRoot = fileURLToPath(new URL("../src/pages/comic", import.meta.url));

// 这些具体类名只用于状态语义(与分类 chip 用的 text-amber-700/bg-emerald-500 等不重叠),
// 因此可安全禁止回退。
const FORBIDDEN_STATUS_CLASSES = [
  "text-emerald-600", // 步骤完成勾选
  "text-green-600", // 全部完成
  "bg-green-500", // 完成进度条
  "text-amber-600", // 部分完成
  "text-amber-900", // 警告提示条
];

async function collectTsx(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectTsx(full));
    else if (entry.name.endsWith(".tsx")) files.push(full);
  }
  return files;
}

test("短剧与漫画页的状态色使用语义 token,不回退到具体调色板类名", async () => {
  const files = [...await collectTsx(dramaRoot), ...await collectTsx(comicRoot)];
  assert.ok(files.length >= 8, `应覆盖短剧与漫画全部页面(实际 ${files.length})`);

  const offenders = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const token of FORBIDDEN_STATUS_CLASSES) {
      if (source.includes(token)) {
        offenders.push(`${file.replace(/\\/g, "/").split("/pages/").pop()} → ${token}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `状态色请改用语义 token(success/warning/destructive):\n${offenders.join("\n")}`);
});

test("短剧与漫画页确实使用了语义状态 token", async () => {
  const files = [...await collectTsx(dramaRoot), ...await collectTsx(comicRoot)];
  const joined = (await Promise.all(files.map((f) => readFile(f, "utf8")))).join("\n");
  assert.match(joined, /text-success/, "应使用 success 语义色");
  assert.match(joined, /text-warning|bg-warning/, "应使用 warning 语义色");
  assert.match(joined, /bg-success/, "应使用 success 进度/背景语义色");
});
