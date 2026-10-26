const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

// RF-3 密钥存储加固守卫:API Key 落库加密、读取解密、存量明文自动迁移。
process.env.AI_NOVEL_MASTER_KEY = crypto.randomBytes(32).toString("base64");

require("../dist/app.js");
const { prisma } = require("../dist/db/prisma.js");
const {
  encryptSecret,
  decryptSecret,
  isEncryptedSecret,
  resetSecretCipherCacheForTests,
} = require("../dist/services/settings/secretStore/secretCipher.js");
const {
  DatabaseSecretStore,
} = require("../dist/services/settings/secretStore/DatabaseSecretStore.js");

const PLAINTEXT = "sk-test-1234567890";

test("cipher:AES-256-GCM 往返、前缀标识与随机 IV", () => {
  const first = encryptSecret(PLAINTEXT);
  const second = encryptSecret(PLAINTEXT);
  assert.ok(first.startsWith("enc:v1:"), "必须带版本前缀");
  assert.notEqual(first, second, "相同明文每次加密应因随机 IV 而不同");
  assert.equal(decryptSecret(first), PLAINTEXT);
  assert.equal(decryptSecret(second), PLAINTEXT);
  assert.equal(isEncryptedSecret(first), true);
  assert.equal(isEncryptedSecret(PLAINTEXT), false);
});

test("cipher:存量明文透传,密文被篡改时解密失败", () => {
  assert.equal(decryptSecret(PLAINTEXT), PLAINTEXT, "旧明文必须可继续读取");
  const encrypted = encryptSecret(PLAINTEXT);
  const tampered = encrypted.slice(0, -4) + "AAAA";
  assert.throws(() => decryptSecret(tampered), /unable to authenticate|bad decrypt|格式/i);
});

test("cipher:主密钥不匹配时拒绝解密", () => {
  const encrypted = encryptSecret(PLAINTEXT);
  const originalKey = process.env.AI_NOVEL_MASTER_KEY;
  process.env.AI_NOVEL_MASTER_KEY = crypto.randomBytes(32).toString("base64");
  resetSecretCipherCacheForTests();
  try {
    assert.throws(() => decryptSecret(encrypted));
  } finally {
    process.env.AI_NOVEL_MASTER_KEY = originalKey;
    resetSecretCipherCacheForTests();
  }
});

function stubApiKey(methods) {
  const restores = [];
  for (const [name, impl] of Object.entries(methods)) {
    const original = prisma.aPIKey[name];
    prisma.aPIKey[name] = impl;
    restores.push(() => { prisma.aPIKey[name] = original; });
  }
  return () => restores.forEach((restore) => restore());
}

function row(overrides = {}) {
  return {
    provider: "deepseek",
    displayName: null,
    key: null,
    model: "deepseek-flash",
    baseURL: null,
    authMode: "bearer",
    isActive: true,
    reasoningEnabled: null,
    reasoningEffort: null,
    hiddenModels: "[]",
    concurrencyLimit: null,
    requestIntervalMs: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

test("store:写入加密、读取解密、旧明文兼容", async () => {
  const store = new DatabaseSecretStore();
  let writtenKey = null;
  const restore = stubApiKey({
    create: async ({ data }) => {
      writtenKey = data.key;
      return row({ key: data.key, provider: data.provider });
    },
    findUnique: async () => row({ key: encryptSecret(PLAINTEXT) }),
    findMany: async () => [row({ key: PLAINTEXT }), row({ provider: "kimi", key: encryptSecret("sk-2") })],
  });
  try {
    const created = await store.createProvider("deepseek", { key: PLAINTEXT });
    assert.ok(writtenKey.startsWith("enc:v1:"), "写入数据库的值必须是密文");
    assert.notEqual(writtenKey, PLAINTEXT);
    assert.equal(created.key, PLAINTEXT, "返回给调用方的必须是明文");

    const loaded = await store.getProvider("deepseek");
    assert.equal(loaded.key, PLAINTEXT, "读取时解密");

    const listed = await store.listProviders();
    assert.equal(listed[0].key, PLAINTEXT, "旧明文行透传");
    assert.equal(listed[1].key, "sk-2", "密文行解密");
  } finally {
    restore();
  }
});

test("migration:仅重加密明文行,幂等且保留原值", async () => {
  const store = new DatabaseSecretStore();
  const updates = [];
  let rows = [
    { provider: "deepseek", key: PLAINTEXT },
    { provider: "kimi", key: encryptSecret("sk-2") },
    { provider: "empty", key: null },
  ];
  const restore = stubApiKey({
    findMany: async () => rows.map((item) => ({ ...item })),
    update: async ({ where, data }) => {
      updates.push({ provider: where.provider, key: data.key });
      rows = rows.map((item) => (item.provider === where.provider ? { ...item, key: data.key } : item));
      return row({ provider: where.provider, key: data.key });
    },
  });
  try {
    const first = await store.migratePlaintextSecrets();
    assert.deepEqual(first, { migrated: 1, failed: 0 });
    assert.equal(updates.length, 1);
    assert.equal(updates[0].provider, "deepseek");
    assert.ok(updates[0].key.startsWith("enc:v1:"));
    assert.equal(decryptSecret(updates[0].key), PLAINTEXT, "迁移必须无损");

    const second = await store.migratePlaintextSecrets();
    assert.deepEqual(second, { migrated: 0, failed: 0 }, "二次迁移必须幂等");
    assert.equal(updates.length, 1);
  } finally {
    restore();
  }
});
