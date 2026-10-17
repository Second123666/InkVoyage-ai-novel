export type ExperimentalFeatureKey = "comic" | "drama";

export interface ExperimentalFeatureDefinition {
  key: ExperimentalFeatureKey;
  label: string;
  paths: string[];
}

export const EXPERIMENTAL_FEATURES: readonly ExperimentalFeatureDefinition[] = [
  { key: "comic", label: "漫画工作台", paths: ["/comic"] },
  { key: "drama", label: "短剧工作台", paths: ["/drama"] },
];

export const EXPERIMENTAL_FEATURE_HIDDEN_STORAGE_KEY = "experimentalFeatures.hidden";

function isExperimentalFeatureKey(value: unknown): value is ExperimentalFeatureKey {
  return EXPERIMENTAL_FEATURES.some((feature) => feature.key === value);
}

function resolveStorage(storage?: Pick<Storage, "getItem" | "setItem">): Pick<Storage, "getItem" | "setItem"> | undefined {
  if (storage) {
    return storage;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.localStorage;
}

export function readHiddenExperimentalFeatures(
  storage?: Pick<Storage, "getItem" | "setItem">,
): ExperimentalFeatureKey[] {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return [];
  }
  try {
    const raw = resolved.getItem(EXPERIMENTAL_FEATURE_HIDDEN_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isExperimentalFeatureKey);
  } catch {
    return [];
  }
}

export function writeHiddenExperimentalFeatures(
  keys: readonly ExperimentalFeatureKey[],
  storage?: Pick<Storage, "getItem" | "setItem">,
): void {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return;
  }
  const uniqueKeys = [...new Set(keys.filter(isExperimentalFeatureKey))];
  resolved.setItem(EXPERIMENTAL_FEATURE_HIDDEN_STORAGE_KEY, JSON.stringify(uniqueKeys));
}

export function getExperimentalFeatureForPath(pathname: string): ExperimentalFeatureDefinition | undefined {
  return EXPERIMENTAL_FEATURES.find((feature) =>
    feature.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
  );
}
