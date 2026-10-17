import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPERIMENTAL_FEATURES,
  EXPERIMENTAL_FEATURE_HIDDEN_STORAGE_KEY,
  readHiddenExperimentalFeatures,
  writeHiddenExperimentalFeatures,
  getExperimentalFeatureForPath,
} from "../src/config/experimentalFeatures.ts";

function createFakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

test("readHiddenExperimentalFeatures returns empty array by default", () => {
  const storage = createFakeStorage();
  assert.deepEqual(readHiddenExperimentalFeatures(storage), []);
});

test("hidden features survive a write/read round trip", () => {
  const storage = createFakeStorage();
  writeHiddenExperimentalFeatures(["comic", "drama"], storage);
  assert.deepEqual(readHiddenExperimentalFeatures(storage), ["comic", "drama"]);

  writeHiddenExperimentalFeatures([], storage);
  assert.deepEqual(readHiddenExperimentalFeatures(storage), []);
});

test("corrupted JSON yields empty array", () => {
  const storage = createFakeStorage({
    [EXPERIMENTAL_FEATURE_HIDDEN_STORAGE_KEY]: "{not-valid-json",
  });
  assert.deepEqual(readHiddenExperimentalFeatures(storage), []);
});

test("non-array JSON yields empty array", () => {
  const storage = createFakeStorage({
    [EXPERIMENTAL_FEATURE_HIDDEN_STORAGE_KEY]: JSON.stringify({ comic: true }),
  });
  assert.deepEqual(readHiddenExperimentalFeatures(storage), []);
});

test("getExperimentalFeatureForPath matches registered paths and prefixes", () => {
  assert.equal(getExperimentalFeatureForPath("/comic")?.key, "comic");
  assert.equal(getExperimentalFeatureForPath("/comic/projects/x")?.key, "comic");
  assert.equal(getExperimentalFeatureForPath("/drama")?.key, "drama");
  assert.equal(getExperimentalFeatureForPath("/drama/projects/x")?.key, "drama");
  assert.equal(getExperimentalFeatureForPath("/novels"), undefined);
  assert.equal(getExperimentalFeatureForPath("/"), undefined);
});

test("registry contains exactly comic and drama with expected paths", () => {
  assert.equal(EXPERIMENTAL_FEATURES.length, 2);
  const byKey = new Map(EXPERIMENTAL_FEATURES.map((feature) => [feature.key, feature]));
  assert.deepEqual(byKey.get("comic")?.paths, ["/comic"]);
  assert.deepEqual(byKey.get("drama")?.paths, ["/drama"]);
  assert.equal(byKey.has("comic"), true);
  assert.equal(byKey.has("drama"), true);
});
