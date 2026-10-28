# 桌面打包:原生模块 ABI 与 winCodeSign 权限

## Background

桌面打包会同时改动两处容易被误判的环境状态:`better-sqlite3` 的原生二进制 ABI,以及 electron-builder 解包 `winCodeSign` 时对符号链接权限的依赖。两者都会让“代码没改却突然大面积失败”,因此记录成因与排查路径。

## 失败模式一:server 测试全部 ERR_DLOPEN_FAILED

### 现象

server 测试几乎全量报错,错误里出现:

```
The module '...\better-sqlite3\build\Release\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 133. This version of Node.js requires NODE_MODULE_VERSION 137.
```

### 原因

`133` 是 Electron 35 的 ABI,`137` 是 Node 24 的 ABI。electron-builder 在打包时按 Electron 头文件重建原生模块,重建结果写回 pnpm 共享存储中的同一份 `better-sqlite3`,于是 Node 侧的测试与开发服务器都加载不了它。

这不是代码回归,也不是依赖安装损坏,而是同一份二进制在 Electron 与 Node 之间来回切换。

### 排查步骤

1. 先看错误码:`ERR_DLOPEN_FAILED` + `NODE_MODULE_VERSION` 不一致 ⇒ 环境问题,不要怀疑业务代码。
2. 对比 `node -p process.versions.modules` 与错误里的数字。
3. 重建后在 server 目录直接验证:

```bash
cd server
node -e "const D=require('better-sqlite3');new D(':memory:').exec('create table t(a)');console.log('ok',process.versions.modules)"
```

### 修复

`pnpm rebuild better-sqlite3` 在部分环境不会真正替换二进制(例如企业代理导致预编译包下载失败)。可改用官方预编译安装器显式指定当前 Node 版本:

```bash
cd node_modules/.pnpm/better-sqlite3@12.6.2/node_modules/better-sqlite3
NODE_OPTIONS=--use-system-ca \
  node ../../../../.pnpm/prebuild-install@7.1.3/node_modules/prebuild-install/bin.js \
  -r node -t "$(node -v | sed 's/^v//')"
```

`--use-system-ca` 用于本机存在 TLS 拦截时让下载通过系统证书校验;没有该问题时可以省略。

### 当前规则

- 跑 Node 侧测试前,确认 `better-sqlite3` 是 Node ABI;打完 Windows 安装包后,预期它会变回 Electron ABI。
- 打包与测试交替进行时,把 ABI 重建当成步骤的一部分,不要把它当成偶发故障。

## 失败模式二:winCodeSign 解包失败(符号链接权限)

### 现象

`pnpm verify:desktop-package` 或 `pnpm dist:desktop:nsis` 在 rcedit 阶段失败:

```
ERROR: Cannot create symbolic link : 客户端没有所需的特权 :
...\Cache\winCodeSign\<hash>\darwin\10.12\lib\libcrypto.dylib
```

并伴随 `Sub items Errors: 2`。`--dir`、`dist:desktop:nsis`、`verify:desktop:installer` 都会命中。

### 原因

`winCodeSign-2.6.0.7z` 内含两个 macOS 动态库符号链接,electron-builder 通过 `7za x -snld` 保留链接形式解包。Windows 非管理员进程没有 `SeCreateSymbolicLinkPrivilege`,解包因此返回非零退出码,整个打包中断。

关键点:该下载由 `app-builder.exe rcedit` 子命令在内部触发,不受 `toolsets.winCodeSign = "1.1.0"` 影响,也不受 `ELECTRON_BUILDER_RCEDIT_PATH` 影响。因此升级工具集或手工预解包(缓存目录名每次随机)都无法绕过。

### 当前规则

- **不要在 `electron-builder.config.cjs` 里把 `win.signAndEditExecutable` 改成 `false` 来“修好”本地打包**:那会让发布包丢失 exe 图标、产品名与版本信息。
- 本地无符号链接权限时,只允许用一次性 CLI 覆盖做行为性验证:
  `node desktop/scripts/run-electron-builder.cjs --win nsis --x64 --config.win.signAndEditExecutable=false`
  并在验证记录里明确写“exe 资源未覆盖”。
- 真实发布以 CI 为准:GitHub Actions 的 `windows-latest` 以管理员权限运行,符号链接可创建;`desktop-release.yml` / `desktop-beta-release.yml` 会跑 `verify:desktop-package:reuse-stage`。
- 需要在本机验证 exe 资源时,用缓存里已解包的 `rcedit-x64.exe` 手工补一次,再读回版本信息(见下)。这能证明图标与版本资源本身正确,但不能替代 CI 的完整打包验证。

### 本机补验 exe 资源

```bash
node -e "
const {spawnSync}=require('child_process');const path=require('path');
const exe=path.resolve('desktop/build/dist/win-unpacked/InkVoyage.exe');
const rcedit=path.join(process.env.LOCALAPPDATA,'electron-builder/Cache/winCodeSign/760715571/rcedit-x64.exe');
const r=spawnSync(rcedit,[exe,
 '--set-version-string','ProductName','墨航 InkVoyage',
 '--set-version-string','FileDescription','墨航 InkVoyage',
 '--set-file-version','0.5.0','--set-product-version','0.5.0',
 '--set-icon',path.resolve('desktop/builder/app-icon.ico')],{encoding:'utf8'});
console.log(r.status, r.stderr);
"
```

校验标准:

- `(Get-Item <exe>).VersionInfo` 的 `ProductName` / `FileDescription` / `ProductVersion` 与 `desktop/package.json` 一致;
- 从 exe 提取的 32×32 图标与 `desktop/builder/app-icon.ico` 的 32×32 帧逐像素一致(实测 RMSE 为 0)。

注意:手工补验只改 `build/dist` 下的产物,不改变打包配置,也不影响发布链路。

## Related Modules

- `desktop/electron-builder.config.cjs`
- `desktop/scripts/run-electron-builder.cjs`
- `desktop/scripts/stage-desktop.cjs`
- `desktop/scripts/verify-desktop-package.cjs`
- `desktop/scripts/verify-desktop-installer.cjs`
- `.github/workflows/desktop-release.yml`

## Source Documents

- `docs/wiki/architecture/desktop-identity-migration.md`
- `docs/workflow/PROGRESS.md`(LOOP-66 与 beta 集成验证记录)
