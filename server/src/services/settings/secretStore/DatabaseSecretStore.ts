import { prisma } from "../../../db/prisma";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./secretCipher";
import type { SecretStore, SecretStoreListOptions, SecretStoreRecord, SecretStoreWriteInput } from "./SecretStore";

// RF-3:API Key 落库前加密(AES-256-GCM),读取时解密;存量明文由启动迁移重写为密文。
function encryptNullableKey(key: string | null | undefined): string | null | undefined {
  if (key === undefined || key === null) {
    return key;
  }
  return encryptSecret(key);
}

function toPrismaWriteInput(input: SecretStoreWriteInput): Record<string, unknown> {
  return {
    ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
    ...(input.key !== undefined ? { key: encryptNullableKey(input.key) } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
    ...(input.baseURL !== undefined ? { baseURL: input.baseURL } : {}),
    ...(input.authMode !== undefined ? { authMode: input.authMode } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.reasoningEnabled !== undefined ? { reasoningEnabled: input.reasoningEnabled } : {}),
    ...(input.reasoningEffort !== undefined ? { reasoningEffort: input.reasoningEffort } : {}),
    ...(input.hiddenModels !== undefined ? { hiddenModels: input.hiddenModels } : {}),
    ...(input.concurrencyLimit !== undefined ? { concurrencyLimit: input.concurrencyLimit } : {}),
    ...(input.requestIntervalMs !== undefined ? { requestIntervalMs: input.requestIntervalMs } : {}),
  };
}

function decryptRecordKey(record: SecretStoreRecord): SecretStoreRecord {
  if (!record?.key) {
    return record;
  }
  try {
    return { ...record, key: decryptSecret(record.key) };
  } catch (error) {
    // 主密钥丢失/轮换时,把该厂商视为未配置,避免整站启动失败。
    console.warn(
      `[secret-store] failed to decrypt API key for provider=${record.provider}; treating as unconfigured.`,
      error instanceof Error ? error.message : error,
    );
    return { ...record, key: null };
  }
}

export class DatabaseSecretStore implements SecretStore {
  async listProviders(options?: SecretStoreListOptions): Promise<SecretStoreRecord[]> {
    const rows = await prisma.aPIKey.findMany({
      where: {
        ...(options?.onlyActive ? { isActive: true } : {}),
        ...(options?.providers?.length
          ? {
            provider: {
              in: options.providers,
            },
          }
          : {}),
      },
      orderBy: [{ createdAt: "asc" }],
    });
    return rows.map((row) => decryptRecordKey(row as SecretStoreRecord));
  }

  async getProvider(provider: string): Promise<SecretStoreRecord | null> {
    const row = await prisma.aPIKey.findUnique({
      where: { provider },
    });
    return row ? decryptRecordKey(row as SecretStoreRecord) : null;
  }

  async hasProvider(provider: string): Promise<boolean> {
    const existing = await prisma.aPIKey.findUnique({
      where: { provider },
      select: { id: true },
    });
    return existing != null;
  }

  async createProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    const row = await prisma.aPIKey.create({
      data: ({
        provider,
        ...toPrismaWriteInput(input),
      } as Record<string, unknown>) as never,
    });
    return decryptRecordKey(row as SecretStoreRecord);
  }

  async updateProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    const row = await prisma.aPIKey.update({
      where: { provider },
      data: toPrismaWriteInput(input) as never,
    });
    return decryptRecordKey(row as SecretStoreRecord);
  }

  async upsertProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    const writeInput = toPrismaWriteInput(input);
    const row = await prisma.aPIKey.upsert({
      where: { provider },
      update: writeInput as never,
      create: ({
        provider,
        ...writeInput,
      } as Record<string, unknown>) as never,
    });
    return decryptRecordKey(row as SecretStoreRecord);
  }

  async deleteProvider(provider: string): Promise<void> {
    await prisma.aPIKey.delete({
      where: { provider },
    });
  }

  /**
   * RF-3 迁移:把存量明文 API Key 就地重加密。
   * - 幂等:已加密行跳过;
   * - 安全:先做加密→解密往返校验,失败则保留原值并计数;
   * - 单行失败不阻断其他行。
   */
  async migratePlaintextSecrets(): Promise<{ migrated: number; failed: number }> {
    const rows = await prisma.aPIKey.findMany({
      select: { provider: true, key: true },
    });
    let migrated = 0;
    let failed = 0;
    for (const row of rows) {
      if (!row.key || isEncryptedSecret(row.key)) {
        continue;
      }
      try {
        const encrypted = encryptSecret(row.key);
        if (decryptSecret(encrypted) !== row.key) {
          throw new Error("encrypt/decrypt roundtrip mismatch");
        }
        await prisma.aPIKey.update({
          where: { provider: row.provider },
          data: { key: encrypted },
        });
        migrated += 1;
      } catch (error) {
        failed += 1;
        console.warn(
          `[secret-store] failed to encrypt stored key for provider=${row.provider}; left unchanged.`,
          error instanceof Error ? error.message : error,
        );
      }
    }
    return { migrated, failed };
  }
}
