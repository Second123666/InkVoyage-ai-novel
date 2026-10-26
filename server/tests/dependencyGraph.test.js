const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// RF-5 依赖面收敛守卫:
// ① 运行时(仅值导入)模块图不得有环 —— 类型导入会在编译后擦除,不算环;
// ② RAG 服务改为惰性 getter,模块加载不再立即实例化整条依赖链。

const serverRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(serverRoot, "src");

function listTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function buildValueImportGraph(files) {
  const graph = new Map();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    const deps = [];
    // 每条 import 语句独立匹配(用 ; 截断,避免把相邻 import 合并成一条)。
    const re = /^import\s+(?!type\s)([^;]*?)\s+from\s+"([^"]+)"/gm;
    let match;
    while ((match = re.exec(source)) !== null) {
      const clause = match[1];
      const braces = clause.match(/\{([\s\S]*)\}/);
      if (braces) {
        const specs = braces[1].split(",").map((item) => item.trim()).filter(Boolean);
        if (specs.length > 0 && specs.every((item) => item.startsWith("type "))) {
          continue;
        }
      }
      if (!match[2].startsWith(".")) {
        continue;
      }
      const base = path.resolve(path.dirname(file), match[2]);
      for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
        if (fs.existsSync(candidate)) {
          deps.push(candidate);
          break;
        }
      }
    }
    graph.set(file, deps);
  }
  return graph;
}

test("服务端运行时模块图无循环依赖(仅统计值导入)", () => {
  const files = listTsFiles(srcRoot);
  const graph = buildValueImportGraph(files);
  const state = new Map();
  const stack = [];
  const cycles = [];

  function visit(node) {
    state.set(node, 1);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) {
      const depState = state.get(dep) ?? 0;
      if (depState === 1) {
        const start = stack.indexOf(dep);
        cycles.push(stack.slice(start).concat(dep));
      } else if (depState === 0) {
        visit(dep);
      }
    }
    stack.pop();
    state.set(node, 2);
  }

  for (const file of files) {
    if (!state.get(file)) {
      visit(file);
    }
  }

  const rendered = [...new Set(cycles.map((cycle) => cycle.map((item) => path.relative(srcRoot, item)).join(" -> ")))];
  assert.deepEqual(rendered, [], `运行时循环依赖:\n${rendered.join("\n")}`);
});

test("RAG 服务使用惰性 getter,访问时才实例化且保持单例", () => {
  const { ragServices } = require("../dist/services/rag/index.js");
  const { RagIndexService } = require("../dist/services/rag/RagIndexService.js");

  const descriptor = Object.getOwnPropertyDescriptor(ragServices, "ragIndexService");
  assert.equal(typeof descriptor.get, "function", "ragIndexService 必须是惰性 getter");

  const first = ragServices.ragIndexService;
  const second = ragServices.ragIndexService;
  assert.ok(first instanceof RagIndexService);
  assert.equal(first, second, "重复访问必须返回同一实例");

  assert.ok(ragServices.embeddingService);
  assert.equal(ragServices.embeddingService, ragServices.embeddingService);
  assert.equal(ragServices.ragIndexService, ragServices.ragIndexService);
});
