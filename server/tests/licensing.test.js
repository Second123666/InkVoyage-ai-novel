const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// OPS-5 许可与归属守卫:纯 AGPL 许可、上游归属保留、贡献授权路径存在、第三方无归属素材不回流。
const repoRoot = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("许可文件齐全且 LICENSE 为纯 AGPL-3.0 文本", () => {
  for (const file of ["LICENSE", "NOTICE", "CLA.md", "CONTRIBUTING.md"]) {
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `缺少 ${file}`);
  }
  const license = read("LICENSE");
  assert.match(license, /^\s*GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
  assert.doesNotMatch(license, /Service-style commercial use requires separate commercial authorization/);
  assert.doesNotMatch(license, /dual-license model/i);
});

test("NOTICE 保留上游归属并声明独立衍生与当前许可", () => {
  const notice = read("NOTICE").replace(/\s+/g, " ");
  assert.match(notice, /ExplosiveCoderflome and contributors/, "上游版权声明不得删除");
  assert.match(notice, /independently maintained derivative/, "必须声明独立衍生关系");
  assert.match(notice, /Upstream copyright notices and license terms are preserved/, "必须声明保留上游许可");
  assert.match(notice, /AGPL-3\.0-only/, "必须声明当前许可");
  assert.doesNotMatch(notice, /replace with the maintainer's legal name/i, "不得保留开发备注");
});

test("贡献授权路径存在且按 AGPL 分发", () => {
  const cla = read("CLA.md");
  assert.match(cla, /AGPL-3\.0-only|AGPLv3/, "贡献须可按 AGPL 分发");
  assert.doesNotMatch(cla, /商业授权|commercial distribution|commercial authorization/i, "不得承诺商业再许可");
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

test("无独立许可归属的第三方 shadcn-ui skill 不回流", () => {
  for (const target of [
    ".agents/skills/shadcn-ui",
    ".claude/skills/shadcn-ui",
    "skills-lock.json",
  ]) {
    assert.ok(!fs.existsSync(path.join(repoRoot, target)), `${target} 应保持删除状态`);
  }
});

test("旧品牌截图不回流", () => {
  for (const target of [
    "images/角色库.png",
    "images/知识库.png",
    "images/导演模式-创建中.png",
    "images/导演模式-编辑.png",
    "images/导演模式-选择方向.png",
    "docs/public/flow/screenshots/director-seed-cards.png",
    "docs/public/flow/screenshots/director-candidate-progress.png",
    "docs/public/flow/screenshots/director-confirm-candidates.png",
    "docs/public/flow/screenshots/director-cockpit-running.png",
    "docs/public/flow/screenshots/director-cockpit-character.png",
    "docs/public/flow/screenshots/director-cockpit-beat-sheet.png",
    "docs/public/flow/screenshots/director-create-settings-top.png",
    "docs/public/flow/screenshots/director-create-settings-bottom.png",
  ]) {
    assert.ok(!fs.existsSync(path.join(repoRoot, target)), `${target} 应保持删除状态`);
  }
});
