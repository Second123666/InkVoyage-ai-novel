# LOOP-9 计划 · 角色弧线追踪(INN-A4)

更新:2026-10-20
状态:进行中
配套:BACKLOG INN-A4

## 1. 现状审计

- 拆书侧:形象演变(`BookAnalysisCharacterAppearanceService`)与形象词表服务已存在;
- 演进能力:`novelCoreCharacterService.evolveCharacter` 已可用(手动触发,bible+时间线+RAG → 更新 personality/currentState/currentGoal 并写入 `CharacterTimeline`);
- 生成注入现状:local_state(当前目标/状态/情绪 + 最近事件一行)、character_dynamics(关系阶段/守卫)已在 writer;
- **真实缺口**:`CharacterTimeline`(角色演变事件流水)完全不参与正文生成;角色弧线(性格/目标演变过程)对 writer 不可见。

## 2. 设计(MVP:轨迹注入,零新 LLM 调用)

1. **纯函数** `layeredMemoryContext.ts` 新增 `buildCharacterArcEvents(rows, perCharacterCap=3)`:
   输入按 createdAt 倒序的 CharacterTimeline 行 → 每角色取前 3 条 → `第{chapterOrder}章 {title}: {内容截断100}`;空/无章序行照常处理(`第?章`);
2. **数据**:assembler 取 `characterTimeline`(novelId, createdAt desc, ≤30 行)→ 分组写入 `GenerationContextPackage.characterArcEvents: Record<characterId, string[]>`(schema `z.record(...).default({}).optional()`,旧数据兼容);
3. **注入**:`chapterContextBlocks` 新增 `character_arc` 块(priority 90,mode === "full" 且参与者中有数据才渲染):对每个当前参与者列出其近 3 条演变行;
   writer `contextRequirements` 登记 + `preferredGroups` 保护;
4. **遥测**:provider contract `character_arc`(stages=write、degrade、applicable>3 章、available=package 有非空 arc 记录);
5. **不做**(留后续):evolveCharacter 自动触发(章节定稿后自动演进,涉及新 LLM 调用与配额决策)、关系演变历史独立块(现有 dynamics 阶段 + arc 事件已覆盖)。

## 3. 守卫测试(`server/tests/characterArc.test.js`)

纯函数(分组/限量/倒序/无章序)、writer 登记契约(requirements+preferredGroups)、块与装配静态契约、gating 行为(有数据纳入/无数据降级/早期不评估)。

## 4. 验收对照

「生成时注入角色当前阶段状态」:character_arc(演变轨迹)+ 既有 local_state(当前状态)共同构成,以测试锁定;自动演进与实测漂移对比留后续轮次。

## 5. 验证

server fast 全量;client 未动沿用既往结论;wiki(rag/context-assembly)与 PROGRESS/BACKLOG/release notes 同步。
