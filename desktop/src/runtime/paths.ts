import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DESKTOP_APP_NAME, DESKTOP_LEGACY_APP_NAMES } from "./identity";

const APP_NAME = DESKTOP_APP_NAME;
const PORTABLE_DATA_SUFFIX = "-data";

export interface DesktopRuntimeConfig {
  mode: "desktop";
  apiBaseUrl: string;
  apiTimeoutMs: number;
  isPackaged: boolean;
  appVersion: string;
  isPortable: boolean;
  updateChannel: string;
}

function resolvePortableDesktopAppDataDirForName(appName: string): string | null {
  const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR?.trim();
  if (!portableExecutableDir) {
    return null;
  }

  return path.join(portableExecutableDir, `${appName}${PORTABLE_DATA_SUFFIX}`);
}

function resolvePortableDesktopAppDataDir(): string | null {
  const portableAppName = process.env.PORTABLE_EXECUTABLE_APP_FILENAME?.trim() || APP_NAME;
  return resolvePortableDesktopAppDataDirForName(portableAppName);
}

export function isPortableDesktopRuntime(): boolean {
  return resolvePortableDesktopAppDataDir() != null;
}

export function resolveDesktopAppDataDir(): string {
  const configuredDir = process.env.AI_NOVEL_APP_DATA_DIR?.trim();
  if (configuredDir) {
    return path.resolve(configuredDir);
  }

  const portableDataDir = resolvePortableDesktopAppDataDir();
  if (portableDataDir) {
    return portableDataDir;
  }

  const localAppData = process.env.LOCALAPPDATA?.trim();
  if (localAppData) {
    return path.join(localAppData, APP_NAME);
  }

  const appData = process.env.APPDATA?.trim();
  if (appData) {
    return path.join(appData, APP_NAME);
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", APP_NAME);
  }

  return path.join(os.homedir(), `.${APP_NAME}`);
}

export function resolveDesktopLegacyAppDataDirs(): string[] {
  const dirs = new Set<string>();
  const localAppData = process.env.LOCALAPPDATA?.trim();
  const appData = process.env.APPDATA?.trim();

  for (const legacyName of DESKTOP_LEGACY_APP_NAMES) {
    const portableDir = resolvePortableDesktopAppDataDirForName(legacyName);
    if (portableDir) {
      dirs.add(portableDir);
    }
    if (localAppData) {
      dirs.add(path.join(localAppData, legacyName));
    }
    if (appData) {
      dirs.add(path.join(appData, legacyName));
    }
    if (process.platform === "darwin") {
      dirs.add(path.join(os.homedir(), "Library", "Application Support", legacyName));
    }
    dirs.add(path.join(os.homedir(), `.${legacyName}`));
  }

  return [...dirs];
}

export function resolveDesktopLogsDir(): string {
  return path.join(resolveDesktopAppDataDir(), "logs");
}

export function resolveDesktopMainLogFile(): string {
  return path.join(resolveDesktopLogsDir(), "desktop-main.log");
}

export function resolveDesktopUpdateChannel(): string {
  const configuredChannel = process.env.AI_NOVEL_UPDATE_CHANNEL?.trim();
  return configuredChannel || "beta";
}

export function resolveDesktopRuntimeConfig(options: {
  port: number;
  isPackaged: boolean;
  appVersion: string;
  updateChannel?: string;
}): DesktopRuntimeConfig {
  return {
    mode: "desktop",
    apiBaseUrl: `http://127.0.0.1:${options.port}/api`,
    apiTimeoutMs: 10 * 60 * 1000,
    isPackaged: options.isPackaged,
    appVersion: options.appVersion,
    isPortable: isPortableDesktopRuntime(),
    updateChannel: options.updateChannel ?? resolveDesktopUpdateChannel(),
  };
}

export function resolveRendererDevUrl(): string {
  return process.env.AI_NOVEL_DESKTOP_RENDERER_URL?.trim() || "http://127.0.0.1:5173";
}

export function resolveDesktopResourcesDir(): string {
  const configuredDir = process.env.AI_NOVEL_DESKTOP_RESOURCES_DIR?.trim();
  return configuredDir ? path.resolve(configuredDir) : process.resourcesPath;
}

export function resolveRendererIndexHtml(): string {
  return path.join(resolveDesktopResourcesDir(), "client", "dist", "index.html");
}

export function resolveDesktopWindowIcon(): string {
  if (process.env.AI_NOVEL_DESKTOP_ICON_PATH?.trim()) {
    return path.resolve(process.env.AI_NOVEL_DESKTOP_ICON_PATH.trim());
  }

  const packagedIconPath = path.join(resolveDesktopResourcesDir(), "icons", "app-icon.ico");
  if (fs.existsSync(packagedIconPath)) {
    return packagedIconPath;
  }

  return path.resolve(resolveWorkspaceRoot(), "desktop", "builder", "app-icon.ico");
}

export function resolvePackagedServerEntry(): string {
  return path.join(
    resolveDesktopResourcesDir(),
    "app.asar",
    "node_modules",
    "@ai-novel",
    "server",
    "dist",
    "app.js",
  );
}

export function resolveWorkspaceRoot(): string {
  return path.resolve(__dirname, "../../..");
}
