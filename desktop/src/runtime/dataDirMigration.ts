import fs from "node:fs";
import path from "node:path";
import { resolveDesktopAppDataDir, resolveDesktopLegacyAppDataDirs } from "./paths";

const MIGRATION_MARKER = ".inkvoyage-data-migration.json";
const SKIP_MIGRATION_ENV = "AI_NOVEL_SKIP_DATA_MIGRATION";

export type DesktopDataDirMigrationReason =
  | "already-migrated"
  | "new-data-exists"
  | "no-legacy-data"
  | "configured-data-dir"
  | "skipped"
  | "migrated"
  | "failed";

export interface DesktopDataDirMigrationResult {
  migrated: boolean;
  to: string;
  from?: string;
  reason: DesktopDataDirMigrationReason;
  error?: string;
}

export interface DesktopDataDirMigrationOptions {
  to?: string;
  legacyDirs?: string[];
  ignoreConfiguredDataDir?: boolean;
}

function hasEntries(dir: string): boolean {
  try {
    return fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

function chooseLegacySource(dirs: string[]): string | null {
  const existing = dirs.filter(hasEntries);
  if (existing.length === 0) {
    return null;
  }

  // Prefer the directory that clearly belongs to the desktop app over a stray
  // legacy-named folder created by another tool.
  const withDatabase = existing.find((dir) => fs.existsSync(path.join(dir, "data", "dev.db")));
  return withDatabase ?? existing[0];
}

function removeIfExists(target: string): void {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup only; the old data directory is never touched.
  }
}

/**
 * Copies the legacy desktop data directory into the new InkVoyage directory on
 * first launch. The legacy directory is intentionally kept in place so a failed
 * migration or an older installed build never loses data.
 */
export function migrateLegacyDesktopDataDir(
  options: DesktopDataDirMigrationOptions = {},
): DesktopDataDirMigrationResult {
  const to = options.to ?? resolveDesktopAppDataDir();

  if (!options.ignoreConfiguredDataDir && process.env.AI_NOVEL_APP_DATA_DIR?.trim()) {
    return { migrated: false, to, reason: "configured-data-dir" };
  }

  if (String(process.env[SKIP_MIGRATION_ENV] ?? "").trim().toLowerCase() === "true") {
    return { migrated: false, to, reason: "skipped" };
  }

  if (fs.existsSync(path.join(to, MIGRATION_MARKER))) {
    return { migrated: false, to, reason: "already-migrated" };
  }

  if (hasEntries(to)) {
    return { migrated: false, to, reason: "new-data-exists" };
  }

  const from = chooseLegacySource(options.legacyDirs ?? resolveDesktopLegacyAppDataDirs());
  if (!from) {
    return { migrated: false, to, reason: "no-legacy-data" };
  }

  const staging = `${to}.migrating-${process.pid}-${Date.now()}`;
  try {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, staging, { recursive: true, force: true, errorOnExist: false });

    if (fs.existsSync(to)) {
      if (hasEntries(to)) {
        removeIfExists(staging);
        return { migrated: false, to, from, reason: "new-data-exists" };
      }
      fs.rmdirSync(to);
    }

    fs.renameSync(staging, to);
    fs.writeFileSync(
      path.join(to, MIGRATION_MARKER),
      `${JSON.stringify({
        migratedAt: new Date().toISOString(),
        from,
        to,
        source: "desktop-data-dir-migration",
      }, null, 2)}\n`,
      "utf8",
    );

    return { migrated: true, to, from, reason: "migrated" };
  } catch (error) {
    removeIfExists(staging);
    return {
      migrated: false,
      to,
      from,
      reason: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
