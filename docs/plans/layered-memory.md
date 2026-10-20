# LOOP-8 计划 · 分层递归记忆(INN-A3 章→卷→全书摘要树)

更新:2026-10-20
状态:进行中
配套:BACKLOG INN-A3

## 1. 现状审计结论

已有(不重建):
- **章层**:`NovelChapterSummaryService` 章节摘要 + writer 的 `recent_chapters` 块(**仅最近 3 章,全局窗口**);
- **卷层(计划期)**:`volumeWindow` 块(mission/回报梯度/里程碑守卫)、相邻卷摘要(种子)—— 但**没有"本卷已完成章节的滚动回顾"**;
- **全书层**:canonical 快照(时间线/角色/伏笔)—— 时间线只喂了 `PlannerService`(`buildStateContextBlockFromCanonical`),**正文 writer 完全收不到全书时间线**;伏笔/角色状态已有专属块。

真实缺口 = roadmap「长程上下文记忆」的两层:卷内回顾(后段章节脱离全局 3 章窗口)与全书时间线快照(正文无)。

## 2. 设计(零新 PromptAsset、零新 LLM 调用,沿既有块管道)

1. **数据**:`GenerationContextPackage` 增加 `volumeRecap: string[]`、`bookStateSnapshot: string[]`(schema 可选默认 [],向后兼容);
   - `volumeRecap`:定位当前卷(`volumePlans[].chapters.chapterOrder`)→ 查该卷内、当前章之前的 `chapterSummary`(asc,≤8 条)→ 纯函数格式化 `第X章 摘要(截断100字)`;
   - `bookStateSnapshot`:canonical `timeline` 过滤已发生事件、按章序排序、取最近 8 条 → `第X章 标题: 摘要`。
2. **装配**:纯函数模块 `runtime/context/layeredMemoryContext.ts`(`buildBookStateSnapshotLines` / `resolveCurrentVolumeChapterOrders` / `buildVolumeRecapLines`),`GenerationContextAssembler` 调用(单点小查询)+ 写入 contextPackage。
3. **注入**:`buildChapterWriteContext` 从 contextPackage 映射(仿 `previousChaptersSummary→recentChapterSummaries` 模式);`chapterContextBlocks` 新增两块:
   - `book_state_snapshot`(priority 91)、`volume_recap`(priority 89),均 `mode === "full"` 且有数据才建,非 required(预算安全);
   - writer 资产 `contextRequirements` 登记两组 + 进 `preferredGroups`(防预算丢弃,吸取 A1-G2 教训)。
4. **可观测**:provider contracts 增两条(`stages:["write"]`,applicable = 章序 > 3(后段),`failureSemantics:"degrade"`,`evaluate` 分支消费 package 新字段)—— 对应 A1-G8「注入遥测」教训。
5. **不改**:review/repair 块、planner、前端、任何 PromptAsset 版本(纯上下文管道扩展)。

## 3. 守卫测试(`server/tests/layeredMemory.test.js`)

1. 纯函数:快照排除未来事件/排序/截断/限量;卷回顾过滤 `<当前章`/限量;卷定位(命中/未命中);
2. writer 资产契约:注册资产的 `contextRequirements` 含两组、`preferredGroups` 含两组;
3. 块装配静态契约:`chapterContextBlocks` 存在两块 id/group 与 mode 门控;`GenerationContextAssembler` 将两字段写入 contextPackage;
4. provider contracts:新增两条契约存在 + `evaluate` 对"后段有数据/无数据"输出正确 decisions。

## 4. 验收对照

- 「长篇后段生成的上下文含分层摘要」:writer 必达登记(优先级 91/89 + preferred)+ 后段门控(applicable>3 章)+ 装配注入,以测试锁定;
- 「抽样对比后段设定漂移减少」:依赖真实生成对比,属所有者实测项;本轮回退点为单文件级(contextPackage 字段向后兼容,旧快照默认 [])。

## 5. 验证

- server fast 全量;client 未动沿用 LOOP-6/7 结论;
- wiki 与 PROGRESS/BACKLOG/release notes 同步。
