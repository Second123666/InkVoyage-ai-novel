const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const serverRoot = path.resolve(__dirname, "..");
const testsRoot = path.join(serverRoot, "tests");

const integrationTests = new Set([
  "directorTaskFactInspection.test.js",
  "directorWorkflowStepModules.test.js",
  "novelDirectorPipelineRuntime.test.js",
  "novelDirectorRetry.test.js",
  "novelWorkflowRuntime.test.js",
  "p0bRealPrismaChain.test.js",
  "prompting-governance.test.js",
  "prompting.test.js",
  "promptWorkbench.test.js",
  "ragCompatibilityBootstrap.test.js",
  "runtimeMigrations.test.js",
]);

function listTestFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listTestFiles(fullPath);
      }
      return entry.isFile() && entry.name.endsWith(".test.js") ? [fullPath] : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function selectTestFiles(mode) {
  const allFiles = listTestFiles(testsRoot);
  if (mode === "integration") {
    return allFiles.filter((file) => integrationTests.has(path.basename(file)));
  }
  if (mode === "fast") {
    return allFiles.filter((file) => !integrationTests.has(path.basename(file)));
  }
  if (mode === "all") {
    return allFiles;
  }
  throw new Error(`Unknown test mode: ${mode}`);
}

const mode = process.argv[2] ?? "fast";
const files = selectTestFiles(mode);

if (files.length === 0) {
  console.error(`No tests selected for mode ${mode}.`);
  process.exit(1);
}

// fast 与 integration 都必须进程隔离：部分测试会向 require.cache 注入
// 假 prisma / promptRunner 模块且不还原，单进程 require 全部文件会造成
// 跨文件污染（曾导致 pipelineExecutionLease、dramaPipelineContract 假失败）。
const result = spawnSync(process.execPath, ["--test", ...files], {
  cwd: serverRoot,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
