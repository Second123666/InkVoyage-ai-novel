import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// UI-6 分类色守卫:分类 chip 只能使用受控 category token,状态语义仍走 success/warning 等。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const PALETTE_CLASS = /\b(?:sky|violet|emerald|amber|rose|pink|purple|indigo|cyan|teal)-\d{2,3}\b/;

test("category token 已进入主题与 Tailwind 调色板", async () => {
  const css = await read("src/index.css");
  for (let index = 1; index <= 6; index += 1) {
    const declaration = new RegExp(`--category-${index}:\\s*[\\d.]+\\s+[\\d.]+%\\s+[\\d.]+%`, "g");
    const matches = css.match(declaration) ?? [];
    assert.ok(matches.length >= 2, `--category-${index} 必须在浅色与深色主题中各定义一次`);
  }

  const tailwind = await read("tailwind.config.ts");
  for (let index = 1; index <= 6; index += 1) {
    assert.match(tailwind, new RegExp(`"category-${index}":\\s*"hsl\\(var\\(--category-${index}\\)\\)"`), `Tailwind 必须暴露 category-${index}`);
  }
});

test("漫画分类 chip 已迁移到 category token,无调色板残留", async () => {
  const characters = await read("src/pages/comic/project/CharactersPanel.tsx");
  const panels = await read("src/pages/comic/project/PanelsGridPanel.tsx");

  assert.match(characters, /border-category-1\/30 bg-category-1\/10 text-category-1/, "性别/事实分类必须使用 category token");
  assert.match(characters, /bg-category-2/, "资产类型 dot 必须使用 category token");
  assert.match(panels, /border-category-3\/30 bg-category-3\/10 text-category-3/, "资产/密度分类必须使用 category token");

  for (const [name, source] of [["CharactersPanel", characters], ["PanelsGridPanel", panels]]) {
    assert.doesNotMatch(source, PALETTE_CLASS, `${name} 不得残留调色板分类色`);
  }

  assert.match(characters, /generating: "bg-info/, "生成中状态必须使用 info 语义色");
  assert.match(characters, /done: "bg-success"/, "完成状态必须使用 success 语义色");
  assert.match(characters, /error: "bg-destructive"/, "失败状态必须使用 destructive 语义色");
  assert.match(panels, /border-warning\/40 bg-warning\/10/, "待重抽提示必须使用 warning 语义色");
});
