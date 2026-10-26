const { execFileSync } = require("node:child_process");
const path = require("node:path");

// 一键停止本地开发进程:先清理 ts-node-dev 残留,再释放 3000 / 5173 端口。
// 只按端口与已知 dev 进程识别,不会误杀其他 Node 项目。
const repoRoot = path.resolve(__dirname, "..");
const DEV_PORTS = [3000, 5173];
const powershellPath = process.env.SystemRoot
  ? path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "powershell.exe";

function runStaleServerCleanup() {
  try {
    execFileSync(
      process.execPath,
      [path.join(repoRoot, "server", "scripts", "stop-stale-dev-server.cjs")],
      { stdio: "inherit" },
    );
  } catch (error) {
    console.warn(`[dev-stop] stale server cleanup skipped: ${error.message}`);
  }
}

function listListeningPidsOnWindows() {
  const command = [
    "$ErrorActionPreference = 'SilentlyContinue';",
    `Get-NetTCPConnection -LocalPort ${DEV_PORTS.join(",")} -State Listen`,
    "| Select-Object -ExpandProperty OwningProcess -Unique",
  ].join(" ");
  const output = execFileSync(
    powershellPath,
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
  return [...new Set(
    output
      .split(/\s+/)
      .map((value) => Number.parseInt(value, 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0),
  )];
}

function stopPidsOnWindows(pids) {
  if (pids.length === 0) {
    return;
  }
  execFileSync(
    powershellPath,
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Stop-Process -Id ${pids.join(",")} -Force -ErrorAction SilentlyContinue`,
    ],
    { stdio: "ignore" },
  );
}

function stopOnPosix() {
  for (const port of DEV_PORTS) {
    try {
      execFileSync("sh", ["-c", `lsof -ti tcp:${port} | xargs -r kill -9`], { stdio: "ignore" });
    } catch {
      // 端口本来就没有进程时 lsof 会返回非零,忽略即可。
    }
  }
}

function main() {
  runStaleServerCleanup();

  if (process.platform === "win32") {
    const pids = listListeningPidsOnWindows();
    stopPidsOnWindows(pids);
    if (pids.length > 0) {
      console.log(`[dev-stop] stopped ${pids.length} process(es) on ports ${DEV_PORTS.join(" / ")}.`);
    }
  } else {
    stopOnPosix();
  }

  console.log("[dev-stop] done. Ports 3000 / 5173 should now be free.");
}

main();
