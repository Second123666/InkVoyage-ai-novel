import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// RF-3 密钥存储加固:API Key 落库前用 AES-256-GCM 加密。
// 主密钥来源优先级:AI_NOVEL_MASTER_KEY(环境变量)→ AI_NOVEL_MASTER_KEY_PATH →
// <cwd>/data/secrets/master.key(与 SQLite 库同目录,随库一起备份)。
// 存量明文通过前缀嗅探兼容,并在启动迁移中就地重加密。

const ENCRYPTED_PREFIX = "enc:v1:";
const KEY_BYTES = 32;
const IV_BYTES = 12;

let cachedMasterKey: Buffer | null = null;

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

export function resolveMasterKeyPath(): string {
  const override = process.env.AI_NOVEL_MASTER_KEY_PATH?.trim();
  if (override) {
    return path.resolve(override);
  }
  return path.resolve(process.cwd(), "data", "secrets", "master.key");
}

function parseKeyMaterial(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const hex = /^[0-9a-fA-F]{64}$/.test(trimmed) ? Buffer.from(trimmed, "hex") : null;
  if (hex && hex.length === KEY_BYTES) {
    return hex;
  }
  const base64 = Buffer.from(trimmed, "base64");
  return base64.length === KEY_BYTES ? base64 : null;
}

function createMasterKeyFile(filePath: string): Buffer {
  const key = randomBytes(KEY_BYTES);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, key.toString("base64"), { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Windows 等平台可能不支持 chmod;写入权限仍由用户目录隔离。
  }
  return key;
}

export function loadMasterKey(): Buffer {
  if (cachedMasterKey) {
    return cachedMasterKey;
  }
  const envKey = process.env.AI_NOVEL_MASTER_KEY?.trim();
  if (envKey) {
    const parsed = parseKeyMaterial(envKey);
    if (!parsed) {
      throw new Error("AI_NOVEL_MASTER_KEY 必须是 32 字节的 base64 或 64 位 hex。");
    }
    cachedMasterKey = parsed;
    return parsed;
  }
  const filePath = resolveMasterKeyPath();
  if (fs.existsSync(filePath)) {
    const parsed = parseKeyMaterial(fs.readFileSync(filePath, "utf8"));
    if (!parsed) {
      throw new Error(`主密钥文件格式无效:${filePath}`);
    }
    cachedMasterKey = parsed;
    return parsed;
  }
  const created = createMasterKeyFile(filePath);
  cachedMasterKey = created;
  return created;
}

export function encryptSecret(plaintext: string): string {
  if (isEncryptedSecret(plaintext)) {
    return plaintext;
  }
  const key = loadMasterKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${[
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":")}`;
}

export function decryptSecret(stored: string): string {
  if (!isEncryptedSecret(stored)) {
    return stored;
  }
  const payload = stored.slice(ENCRYPTED_PREFIX.length).split(":");
  if (payload.length !== 3) {
    throw new Error("加密密钥格式无效。");
  }
  const [ivB64, tagB64, dataB64] = payload;
  const decipher = createDecipheriv("aes-256-gcm", loadMasterKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** 测试/运维:清理模块级缓存(环境变量或密钥文件切换后调用)。 */
export function resetSecretCipherCacheForTests(): void {
  cachedMasterKey = null;
}
