const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// OPS-3 许可与归属守卫:双许可文件齐全、包声明一致、上游归属保留、贡献授权路径存在。
const repoRoot = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("许可文件齐全且 LICENSE 含完整 AGPL-3.0 文本", () => {
  for (const file of ["LICENSE", "NOTICE", "CLA.md", "CONTRIBUTING.md"]) {
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `缺少 ${file}`);
  }
  const license = read("LICENSE");
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
  assert.match(license, /Service-style commercial use requires separate commercial authorization/, "服务型商用须单独授权");
});

test("NOTICE 保留上游归属并声明独立衍生", () => {
  const notice = read("NOTICE").replace(/\s+/g, " ");
  assert.match(notice, /ExplosiveCoderflome and contributors/, "上游版权声明不得删除");
  assert.match(notice, /independently maintained derivative/, "必须声明独立衍生关系");
  assert.match(notice, /Upstream copyright notices and license terms are preserved/, "必须声明保留上游许可");
});

test("贡献授权路径存在且允许双许可再分发", () => {
  const cla = read("CLA.md");
  assert.match(cla, /AGPL-3\.0-only|AGPLv3/, "贡献须可按 AGPL 分发");
  assert.match(cla, /商业授权|commercial/i, "必须覆盖商业再许可");
  assert.match(cla, /你保留自己对贡献所拥有的版权/, "不得要求版权转让");
  const contributing = read("CONTRIBUTING.md");
  assert.match(contributing, /CLA\.md/, "贡献指南必须链接 CLA");
});

test("所有 workspace 包的 license 字段统一为 AGPL-3.0-only", () => {
  for (const pkg of ["package.json", "client/package.json", "server/package.json", "shared/package.json", "desktop/package.json", "site/package.json"]) {
    const parsed = JSON.parse(read(pkg));
    assert.equal(parsed.license, "AGPL-3.0-only", `${pkg} license 不一致`);
  }
});
