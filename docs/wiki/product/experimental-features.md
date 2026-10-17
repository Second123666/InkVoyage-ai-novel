# 实验特性（漫画 / 短剧）的产品定位

## Background

漫画工作台与短剧工作台属于衍生工坊：它们消费小说已经产生的章节、角色和场景，而不是帮助用户完成小说主链。对以"写完一本长篇"为目标的新手来说，把未成熟能力与主链导航并列展示会抬高选择成本，并让用户误以为可以先做漫画 / 短剧、再回头补小说。2026-10-15，项目所有者拍板：漫画 / 短剧降级为实验特性（BACKLOG FEAT-1 / FEAT-2），优先级低于小说主链。

## Decision

漫画工作台、短剧工作台在产品中定位为实验特性，不进入主链的默认承诺范围：

- 导航入口保留可达，但带"实验"徽标，表明界面与流程可能调整；
- 提供总开关（系统设置 → 外观与主题，默认显示），关闭后只隐藏导航入口，路由始终可直达；
- 对应公开文档必须带实验状态标注；短剧文档还需明示视频成片默认使用模拟演示通道，未接入真实视频生成服务时不会产出真实视频。

## Current Rule

1. 实验特性注册表在 `client/src/config/experimentalFeatures.ts`，维护"路由路径 → 实验特性 key"的映射；新增或调整实验特性时先改注册表。
2. 导航入口（`client/src/components/layout/Sidebar.tsx`）按注册表路径自动匹配徽标与过滤，不在入口组件里硬编码特性名单。
3. 总开关位于 系统设置 → 外观与主题（`client/src/pages/settings/views/AppearanceSettingsPage.tsx`），默认显示实验入口；关闭开关只隐藏导航入口，不拦截路由——直接访问 URL 仍可进入工作台。
4. 实验特性的公开文档（`docs/public/` 下对应模块页）必须在标题后写明"状态：实验特性"，并在需要时说明能力边界（如短剧视频成片为模拟演示）。
5. 实验特性不得无标注进入主链导航、新手引导或 README 主功能列表。
6. 关闭总开关后，小说主链功能不受影响；实验特性仍通过直达路由可用，不构成数据删除或功能下线。

## Examples

- 新增一个实验特性：
  1. 在 `client/src/config/experimentalFeatures.ts` 注册 key 与路由映射；
  2. 侧边栏入口按路径自动获得"实验"徽标与开关过滤，无需改 Sidebar 组件；
  3. 在 `docs/public` 对应模块文档标题后加状态标注。
- 用户关闭实验入口后，从收藏的 URL 打开漫画工作台：页面应正常可用，因为开关只影响导航可见性。

## Failure Modes

- 把"入口隐藏"当成"路由下线"：关闭开关后路由必须仍可直达；用路由守卫拦截会破坏"只隐藏、不强制"的约定。
- 未完成 / 不稳定的能力不带实验标注直接放进主链导航或 README 主功能区：新手会把实验能力当作正式承诺，失败后对整套产品失去信任。
- 在 Sidebar 或设置页硬编码特性名单而不走注册表：每加一个实验特性都要改多处，容易漏掉徽标或过滤。
- 实验特性文档缺少状态标注，或短剧文档不说明视频为模拟演示：用户会误以为能直接出片。
- 把实验特性开关做成"删除数据"或"禁用路由"级别的开关：开关只控制入口可见性，不改变数据与可达性。

## Related Modules

- `client/src/components/layout/Sidebar.tsx` —— 导航入口"实验"徽标与过滤
- `client/src/pages/settings/views/AppearanceSettingsPage.tsx` —— 实验入口总开关
- `docs/public/modules/comic-workspace.md` / `docs/public/modules/short-drama-workspace.md` —— 对应公开文档与状态标注
- `docs/wiki/workflows/`（小说主链相关页面）—— 实验特性不参与主链承诺

## Source Documents

- `docs/workflow/BACKLOG.md` FEAT-1（漫画工作台降级为实验特性）、FEAT-2（短剧工作台降级为实验特性）；FEAT-3 / FEAT-4 为冻结的后续增强
- `docs/workflow/PROGRESS.md` —— LOOP-3 衍生工坊实验化推进记录
- 2026-10-15 所有者拍板：漫画 / 短剧降级为实验特性
