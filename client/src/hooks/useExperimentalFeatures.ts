import { useCallback, useSyncExternalStore } from "react";
import {
  readHiddenExperimentalFeatures,
  writeHiddenExperimentalFeatures,
  type ExperimentalFeatureKey,
} from "@/config/experimentalFeatures";

export interface UseExperimentalFeaturesResult {
  hidden: ExperimentalFeatureKey[];
  isHidden: (key: ExperimentalFeatureKey) => boolean;
  setHidden: (key: ExperimentalFeatureKey, isHidden: boolean) => void;
}

const EMPTY_HIDDEN: ExperimentalFeatureKey[] = [];

let cachedSnapshot: ExperimentalFeatureKey[] = EMPTY_HIDDEN;
let cachedSerialized = "";
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): ExperimentalFeatureKey[] {
  const next = readHiddenExperimentalFeatures();
  const nextSerialized = JSON.stringify(next);
  if (nextSerialized !== cachedSerialized) {
    cachedSerialized = nextSerialized;
    cachedSnapshot = next;
  }
  return cachedSnapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): ExperimentalFeatureKey[] {
  return EMPTY_HIDDEN;
}

export function useExperimentalFeatures(): UseExperimentalFeaturesResult {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hiddenSet = new Set(hidden);

  const setHidden = useCallback((key: ExperimentalFeatureKey, isHidden: boolean) => {
    const current = readHiddenExperimentalFeatures();
    const next = isHidden
      ? [...new Set([...current, key])]
      : current.filter((item) => item !== key);
    writeHiddenExperimentalFeatures(next);
    notifyListeners();
  }, []);

  return {
    hidden,
    isHidden: (key: ExperimentalFeatureKey) => hiddenSet.has(key),
    setHidden,
  };
}
