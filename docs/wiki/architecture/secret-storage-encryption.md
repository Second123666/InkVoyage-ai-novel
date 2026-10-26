# 模型密钥加密存储(Secret Storage Encryption)

## 背景

`DatabaseSecretStore` 原先把厂商 API Key 以明文写入 `APIKey.key` 列。数据库文件、备份或误提交都会直接泄露密钥,既影响自用安全,也是开源就绪的硬缺口(RF-3)。

## 决策

API Key **落库前**用 AES-256-GCM 加密,读取时解密;主密钥与数据库分离存放;存量明文在服务启动时就地迁移为密文,迁移幂等且逐行容错。

## 当前规则

1. **加密格式**:`enc:v1:<base64 iv>:<base64 tag>:<base64 ciphertext>`。版本前缀用于识别密文;不带前缀的值按**存量明文**透传读取(向后兼容)。
2. **主密钥来源**(优先级从高到低):
   - 环境变量 `AI_NOVEL_MASTER_KEY`(32 字节 base64 或 64 位 hex);
   - 环境变量 `AI_NOVEL_MASTER_KEY_PATH` 指定的文件;
   - 默认 `<cwd>/data/secrets/master.key`,首次启动自动生成(base64,尽力设置 0600)。
   桌面端服务进程的工作目录即用户数据目录,因此密钥文件与 SQLite 同目录。
3. **读写边界**:`DatabaseSecretStore` 的写入方法(create/update/upsert)只加密 `key` 字段;读取方法(find/findMany)返回前解密。其它非敏感字段不加密。
4. **启动迁移**:`migratePlaintextSecrets()` 在 `loadProviderApiKeys()` 之前执行;只处理非空且未加密的行;每行先加密再解密往返校验,一致才写回;单行失败保留原值并计数,不阻断启动。
5. **解密失败策略**:某厂商密钥解密失败(主密钥丢失或被替换)时,该厂商按未配置处理并输出告警,不阻塞整站启动;其它厂商不受影响。
6. **备份要求**:数据库备份**必须同时包含主密钥文件/环境变量**;只恢复数据库而丢失主密钥,已加密的密钥将不可用(等价于未配置)。
7. **测试**:`server/tests/secretStorage.test.js` 覆盖往返、随机 IV、篡改拒绝、主密钥不匹配、明文兼容、写入加密/读取解密、迁移幂等与无损。

## 失败模式

- **启动后所有厂商显示未配置**:检查主密钥是否匹配(环境变量被改、密钥文件被覆盖)。不要把密钥降级回明文来"修复";应恢复原主密钥。
- **日志出现 `failed to decrypt API key`**:同上,主密钥不匹配或密文损坏;该厂商需要重新填写 API Key。
- **日志出现 `failed to encrypt stored key`**:迁移写入失败(权限/数据库锁),原值保留;修复后下次启动会重试。
- **桌面版换机后密钥不可用**:迁移时未带走 `data/secrets/master.key`;数据库与密钥文件需成对迁移。
- **不要把 `data/secrets/master.key` 提交到仓库或打进公开安装包**;每个部署实例应各自生成。

## 相关模块

- `server/src/services/settings/secretStore/secretCipher.ts`(加解密与主密钥解析)
- `server/src/services/settings/secretStore/DatabaseSecretStore.ts`(读写加密与迁移)
- `server/src/app.ts`(启动顺序:迁移 → 加载内存密钥缓存)
- `server/tests/secretStorage.test.js`
