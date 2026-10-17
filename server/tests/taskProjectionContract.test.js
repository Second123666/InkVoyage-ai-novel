const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// 任务投影契约守卫(LOOP-4 / INN-B2 · docs/plans/task-projection-contract.md §4/§5)
// 三层契约:后端真实状态 → 运行记录 API → 前端展示必须可对照。
// 「待手动恢复」不是独立状态,而是 (status, pendingManualRecovery=true) 组合。
require("../dist/app.js");
const { prisma } = require("../dist/db/prisma.js");
const { BookTaskAdapter } = require("../dist/services/task/adapters/BookTaskAdapter.js");
const { PipelineTaskAdapter } = require("../dist/services/task/adapters/PipelineTaskAdapter.js");
const { KnowledgeTaskAdapter } = require("../dist/services/task/adapters/KnowledgeTaskAdapter.js");
const { ImageTaskAdapter } = require("../dist/services/task/adapters/ImageTaskAdapter.js");
const { AgentRunTaskAdapter } = require("../dist/services/task/adapters/AgentRunTaskAdapter.js");
const { StyleExtractionTaskAdapter } = require("../dist/services/task/adapters/StyleExtractionTaskAdapter.js");
const { NovelWorkflowTaskAdapter } = require("../dist/services/task/adapters/NovelWorkflowTaskAdapter.js");
const { buildNovelWorkflowDetailSteps } = require("../dist/services/task/novelWorkflowDetailSteps.js");
const { buildNovelWorkflowSourceRoute } = require("../dist/services/novel/workflow/novelWorkflow.shared.js");

const repoRoot = path.resolve(__dirname, "..");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

function readSharedTaskTypes() {
  return fs.readFileSync(path.resolve(repoRoot, "..", "shared", "types", "task.ts"), "utf8");
}

function readSharedTaskKinds() {
  const source = readSharedTaskTypes();
  const match = source.match(/export type TaskKind =([\s\S]*?);/);
  assert.ok(match, "TaskKind 必须能从 shared/types/task.ts 读取,防止契约漂移");
  return [...match[1].matchAll(/"([a-z_]+)"/g)].map((item) => item[1]);
}

const TASK_STATUS_CONTRACT = ["queued", "running", "waiting_approval", "succeeded", "failed", "cancelled"];

// 统一契约字段:所有任务适配器的 summary 输出都必须携带的公共字段。
// kind 差异白名单(显式列出,不做隐式假设):
//   - 有 pendingManualRecovery 列的 kind(有列即出):book_analysis / novel_pipeline / image_generation / novel_workflow / style_extraction
//   - 无该列的 kind(无列不出):knowledge_document / agent_run
const CORE_SUMMARY_FIELDS = [
  "id",
  "kind",
  "title",
  "status",
  "progress",
  "attemptCount",
  "maxAttempts",
  "createdAt",
  "updatedAt",
  "ownerId",
  "ownerLabel",
  "sourceRoute",
];
const PMR_COLUMN_KINDS = ["book_analysis", "novel_pipeline", "image_generation", "novel_workflow", "style_extraction"];
const NO_PMR_COLUMN_KINDS = ["knowledge_document", "agent_run"];

const BASE_TIME = new Date("2026-10-17T08:00:00.000Z");
const HEARTBEAT_TIME = new Date("2026-10-17T08:05:00.000Z");

function buildWorkflowRow(overrides = {}) {
  return {
    id: "workflow-task-1",
    title: "AI 自动导演",
    lane: "auto_director",
    status: "running",
    pendingManualRecovery: false,
    progress: 0.5,
    currentStage: "节奏 / 拆章",
    currentItemKey: "beat_sheet",
    currentItemLabel: "正在生成第 1 卷节奏板",
    checkpointType: null,
    checkpointSummary: null,
    resumeTargetJson: null,
    attemptCount: 0,
    maxAttempts: 3,
    lastError: null,
    createdAt: BASE_TIME,
    updatedAt: HEARTBEAT_TIME,
    heartbeatAt: HEARTBEAT_TIME,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    llmCallCount: 0,
    lastTokenRecordedAt: null,
    novelId: "novel-1",
    novel: { title: "示例小说", creationExperience: "professional" },
    ...overrides,
  };
}

// 每个 kind 的 summary 输出都要过一遍统一契约断言;stub 只提供适配器 list() 真正读取的列。
const ADAPTER_CASES = {
  book_analysis: {
    stubs: {
      "bookAnalysis.findMany": async () => [{
        id: "book-task-1",
        title: "拆书任务",
        status: "running",
        progress: 0.4,
        currentStage: "generating_sections",
        currentItemLabel: "生成章节",
        attemptCount: 1,
        maxAttempts: 3,
        lastError: null,
        createdAt: BASE_TIME,
        updatedAt: HEARTBEAT_TIME,
        heartbeatAt: HEARTBEAT_TIME,
        pendingManualRecovery: true,
        documentId: "doc-1",
        document: { id: "doc-1", title: "素材文档" },
      }],
    },
    load: () => new BookTaskAdapter().list({ take: 10 }),
  },
  novel_pipeline: {
    stubs: {
      "generationJob.findMany": async () => [{
        id: "pipeline-task-1",
        novelId: "novel-1",
        startOrder: 1,
        endOrder: 10,
        status: "running",
        progress: 0.5,
        currentStage: "generating_chapters",
        currentItemLabel: "第 1 章",
        retryCount: 0,
        maxRetries: 3,
        error: null,
        createdAt: BASE_TIME,
        updatedAt: HEARTBEAT_TIME,
        heartbeatAt: HEARTBEAT_TIME,
        payload: null,
        lastErrorType: null,
        pendingManualRecovery: true,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        llmCallCount: 0,
        lastTokenRecordedAt: null,
        novel: { id: "novel-1", title: "示例小说" },
      }],
    },
    load: () => new PipelineTaskAdapter({}).list({ take: 10 }),
  },
  knowledge_document: {
    stubs: {
      "ragIndexJob.findMany": async () => [{
        id: "knowledge-task-1",
        ownerType: "knowledge_document",
        ownerId: "doc-1",
        jobType: "upsert",
        status: "running",
        attempts: 1,
        maxAttempts: 3,
        lastError: null,
        payloadJson: null,
        createdAt: BASE_TIME,
        updatedAt: HEARTBEAT_TIME,
      }],
      "knowledgeDocument.findMany": async () => [{
        id: "doc-1",
        title: "知识文档",
        fileName: "a.md",
        latestIndexStatus: "running",
        lastIndexedAt: null,
      }],
    },
    load: () => new KnowledgeTaskAdapter().list({ take: 10 }),
  },
  image_generation: {
    stubs: {
      "imageGenerationTask.findMany": async () => [{
        id: "image-task-1",
        status: "running",
        progress: 0.3,
        currentStage: "generating",
        currentItemLabel: "生成图片",
        retryCount: 0,
        maxRetries: 3,
        error: null,
        createdAt: BASE_TIME,
        updatedAt: HEARTBEAT_TIME,
        heartbeatAt: HEARTBEAT_TIME,
        sceneType: "character_portrait",
        baseCharacterId: "bc-1",
        novelId: null,
        pendingManualRecovery: true,
        baseCharacter: { id: "bc-1", name: "角色甲" },
        novel: null,
      }],
    },
    load: () => new ImageTaskAdapter().list({ take: 10 }),
  },
  agent_run: {
    stubs: {
      "agentRun.findMany": async () => [{
        id: "agent-task-1",
        novelId: null,
        chapterId: null,
        goal: "整理设定",
        status: "running",
        currentStep: "collect_context",
        error: null,
        createdAt: BASE_TIME,
        updatedAt: HEARTBEAT_TIME,
        steps: [],
      }],
    },
    load: () => new AgentRunTaskAdapter().list({ take: 10 }),
  },
  novel_workflow: {
    stubs: {
      "novelWorkflowTask.findMany": async () => [buildWorkflowRow()],
    },
    load: () => new NovelWorkflowTaskAdapter().list({ take: 10 }),
  },
  style_extraction: {
    stubs: {
      "styleExtractionTask.findMany": async () => [{
        id: "style-task-1",
        name: "仿写风格",
        category: "custom",
        createdStyleProfileId: null,
        createdStyleProfileName: null,
        status: "running",
        progress: 0.2,
        currentStage: "extracting_features",
        currentItemKey: "extracting_features",
        currentItemLabel: "提取写法特征",
        retryCount: 0,
        maxRetries: 3,
        error: null,
        createdAt: BASE_TIME,
        updatedAt: HEARTBEAT_TIME,
        heartbeatAt: HEARTBEAT_TIME,
        pendingManualRecovery: true,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        llmCallCount: 0,
        lastTokenRecordedAt: null,
      }],
    },
    load: () => new StyleExtractionTaskAdapter().list({ take: 10 }),
  },
};

async function withPrismaStubs(stubs, run) {
  const restores = [];
  for (const [target, impl] of Object.entries(stubs)) {
    const [modelName, methodName] = target.split(".");
    const model = prisma[modelName];
    const original = model[methodName];
    model[methodName] = impl;
    restores.push(() => {
      model[methodName] = original;
    });
  }
  try {
    return await run();
  } finally {
    for (const restore of restores) {
      restore();
    }
  }
}

function loadKindSummaries(kind) {
  const adapterCase = ADAPTER_CASES[kind];
  return withPrismaStubs(
    { "taskCenterArchive.findMany": async () => [], ...adapterCase.stubs },
    adapterCase.load,
  );
}

function assertUnifiedSummaryContract(summary, kind) {
  assert.ok(summary, `${kind}: 适配器应投影出任务记录`);
  assert.equal(summary.kind, kind, `${kind}: kind 必须与适配器种类一致`);
  for (const field of CORE_SUMMARY_FIELDS) {
    assert.ok(
      summary[field] !== undefined && summary[field] !== null,
      `${kind}: summary 缺少统一契约字段 ${field}`,
    );
  }
  assert.ok(
    TASK_STATUS_CONTRACT.includes(summary.status),
    `${kind}: status=${summary.status} 必须落在 TaskStatus 契约内`,
  );
  assert.equal(typeof summary.title, "string", `${kind}: title 必须是字符串`);
  assert.equal(typeof summary.progress, "number", `${kind}: progress 必须是数字`);
  assert.equal(typeof summary.attemptCount, "number", `${kind}: attemptCount 必须是数字`);
  assert.equal(typeof summary.maxAttempts, "number", `${kind}: maxAttempts 必须是数字`);
  assert.equal(typeof summary.ownerId, "string", `${kind}: ownerId 必须是字符串`);
  assert.equal(typeof summary.ownerLabel, "string", `${kind}: ownerLabel 必须是字符串`);
  assert.ok(!Number.isNaN(Date.parse(summary.createdAt)), `${kind}: createdAt 必须是可解析时间`);
  assert.ok(!Number.isNaN(Date.parse(summary.updatedAt)), `${kind}: updatedAt 必须是可解析时间`);
  assert.equal(typeof summary.sourceRoute, "string", `${kind}: sourceRoute 必须是字符串`);
  assert.ok(summary.sourceRoute.startsWith("/"), `${kind}: sourceRoute 必须是应用内路由`);
}

test("每个任务适配器的 summary 输出都携带统一契约字段", async () => {
  const contractKinds = readSharedTaskKinds();
  assert.deepEqual(
    [...contractKinds].sort(),
    Object.keys(ADAPTER_CASES).sort(),
    "适配器契约守卫必须覆盖全部 TaskKind",
  );

  for (const kind of contractKinds) {
    const summaries = await loadKindSummaries(kind);
    assert.equal(summaries.length, 1, `${kind}: 期望投影出 1 条任务记录`);
    assertUnifiedSummaryContract(summaries[0], kind);
  }
});

test("待手动恢复按 (status, pendingManualRecovery) 组合投影,status 归位 queued", async () => {
  assert.ok(PMR_COLUMN_KINDS.includes("novel_workflow"));
  const adapter = new NovelWorkflowTaskAdapter();

  await withPrismaStubs(
    {
      "taskCenterArchive.findMany": async () => [],
      "novelWorkflowTask.findMany": async () => [buildWorkflowRow()],
    },
    async () => {
      const [summary] = await adapter.list({ take: 10 });
      assert.ok(summary, "novel_workflow: 期望投影出 1 条任务记录");
      assert.equal(summary.status, "running");
      assert.equal(summary.pendingManualRecovery, false);
    },
  );

  await withPrismaStubs(
    {
      "taskCenterArchive.findMany": async () => [],
      "novelWorkflowTask.findMany": async () => [
        buildWorkflowRow({ status: "running", pendingManualRecovery: true }),
      ],
    },
    async () => {
      const [summary] = await adapter.list({ take: 10 });
      assert.ok(summary, "novel_workflow: 期望投影出 1 条任务记录");
      assert.equal(summary.pendingManualRecovery, true, "pmr=true 必须显式投影到 summary");
      assert.equal(summary.status, "queued", "pmr 组合下 status 归位 queued,不新造状态");
      assert.equal(TASK_STATUS_CONTRACT.includes(summary.status), true);
    },
  );
});

test("无 pendingManualRecovery 列的 kind 不投影该字段(无列不出)", async () => {
  for (const kind of NO_PMR_COLUMN_KINDS) {
    assert.ok(!PMR_COLUMN_KINDS.includes(kind), `${kind} 不应被登记为有 pmr 列`);
    const summaries = await loadKindSummaries(kind);
    assert.equal(summaries.length, 1, `${kind}: 期望投影出 1 条任务记录`);
    assert.equal(
      summaries[0].pendingManualRecovery,
      undefined,
      `${kind}: 存储表没有 pendingManualRecovery 列,summary 不应携带该字段`,
    );
  }
});

test("共享类型把 pendingManualRecovery 定义为各 kind 通用可选字段", () => {
  const source = readSharedTaskTypes();
  const interfaceStart = source.indexOf("export interface UnifiedTaskSummary {");
  assert.ok(interfaceStart >= 0, "UnifiedTaskSummary 必须保持在 shared/types/task.ts");
  const interfaceEnd = source.indexOf("\n}", interfaceStart);
  assert.ok(interfaceEnd > interfaceStart, "UnifiedTaskSummary 接口应能完整读取");
  const summaryBlock = source.slice(interfaceStart, interfaceEnd);
  assert.match(
    summaryBlock,
    /pendingManualRecovery\?: boolean;/,
    "pendingManualRecovery 必须是各 kind 通用可选字段(有列即出、无列不出)",
  );
});

function extractImportFrom(source, moduleSuffix) {
  const importPattern = /import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)";/g;
  let match;
  while ((match = importPattern.exec(source)) !== null) {
    if (match[2].endsWith(moduleSuffix)) {
      return {
        specifier: match[2],
        bindings: match[1]
          .split(",")
          .map((part) => part.trim().split(/\s+as\s+/).pop().trim())
          .filter(Boolean),
      };
    }
  }
  return null;
}

test("RecoveryTaskService 与 NovelWorkflowTaskAdapter 的 sourceRoute 走同一共享构造器", () => {
  const adapterPath = path.join(repoRoot, "src", "services", "task", "adapters", "NovelWorkflowTaskAdapter.ts");
  const recoveryPath = path.join(repoRoot, "src", "services", "task", "RecoveryTaskService.ts");
  const sharedPath = path.join(repoRoot, "src", "services", "novel", "workflow", "novelWorkflow.shared.ts");
  const adapterSource = fs.readFileSync(adapterPath, "utf8");
  const recoverySource = fs.readFileSync(recoveryPath, "utf8");
  const sharedSource = fs.readFileSync(sharedPath, "utf8");

  const adapterImport = extractImportFrom(adapterSource, "novel/workflow/novelWorkflow.shared");
  const recoveryImport = extractImportFrom(recoverySource, "novel/workflow/novelWorkflow.shared");
  assert.ok(adapterImport, "NovelWorkflowTaskAdapter 必须从共享模块引入 sourceRoute 构造器");
  assert.ok(recoveryImport, "RecoveryTaskService 必须从共享模块引入 sourceRoute 构造器");
  assert.ok(
    adapterImport.bindings.includes("buildNovelWorkflowSourceRoute"),
    "NovelWorkflowTaskAdapter 必须引用共享构造器 buildNovelWorkflowSourceRoute",
  );
  assert.ok(
    recoveryImport.bindings.includes("buildNovelWorkflowSourceRoute"),
    "RecoveryTaskService 必须引用共享构造器 buildNovelWorkflowSourceRoute",
  );

  const resolveTarget = (filePath, specifier) => path.resolve(path.dirname(filePath), `${specifier}.ts`);
  assert.equal(
    resolveTarget(adapterPath, adapterImport.specifier),
    resolveTarget(recoveryPath, recoveryImport.specifier),
    "任务中心与恢复候选必须解析到同一个共享文件",
  );
  assert.equal(
    resolveTarget(adapterPath, adapterImport.specifier),
    sharedPath,
    "共享构造器必须定义在 novelWorkflow.shared.ts",
  );

  assert.match(sharedSource, /export function buildNovelWorkflowSourceRoute\(/);
  assert.ok(adapterSource.includes("buildNovelWorkflowSourceRoute({"), "任务中心 summary 必须调用共享构造器");
  assert.ok(recoverySource.includes("buildNovelWorkflowSourceRoute({"), "恢复候选必须调用共享构造器");
  assert.doesNotMatch(
    recoverySource,
    /function\s+buildWorkflowSourceRoute/,
    "恢复候选不得再保留本地 sourceRoute 重实现",
  );

  assert.equal(typeof buildNovelWorkflowSourceRoute, "function");
  assert.equal(
    buildNovelWorkflowSourceRoute({
      id: "task-guard-1",
      checkpointType: "candidate_selection_required",
      currentItemKey: "auto_director",
      resumeTargetJson: null,
      seedPayloadJson: null,
    }),
    "/novels/auto-director?taskId=task-guard-1",
    "候选选择任务必须落到导演创建页",
  );
  assert.equal(
    buildNovelWorkflowSourceRoute({
      id: "task-guard-2",
      checkpointType: null,
      currentItemKey: "chapter_execution",
      resumeTargetJson: JSON.stringify({
        route: "/novels/:id/edit",
        novelId: "novel-9",
        taskId: "task-guard-2",
        stage: "chapter",
        chapterId: null,
        volumeId: null,
      }),
      seedPayloadJson: null,
    }),
    "/novels/novel-9/edit?stage=chapter&directorTaskId=task-guard-2",
    "编辑页恢复目标必须统一带 directorTaskId 深链",
  );
});

function extractRouteHandler(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `routes/tasks.ts 缺少处理器:${startMarker}`);
  const rest = source.slice(start);
  const end = rest.indexOf("\nrouter.");
  assert.ok(end > 0, `routes/tasks.ts 处理器未正常结束:${startMarker}`);
  return rest.slice(0, end);
}

test("任务中心 GET / 与 GET /:kind/:id 不再隐式触发 heal", () => {
  const routesSource = readSource("routes", "tasks.ts");
  const listHandler = extractRouteHandler(routesSource, 'router.get("/",');
  const detailHandler = extractRouteHandler(routesSource, 'router.get("/:kind/:id",');
  assert.match(listHandler, /taskCenterService\.listTasks/, "GET / 处理器必须走只读聚合");
  assert.match(detailHandler, /taskCenterService\.getTaskDetail/, "GET /:kind/:id 处理器必须走只读详情");
  assert.doesNotMatch(listHandler, /heal/i, "GET / 不得出现 heal 相关传参或调用");
  assert.doesNotMatch(detailHandler, /heal/i, "GET /:kind/:id 不得出现 heal 相关传参或调用");

  const taskCenterSource = readSource("services", "task", "TaskCenterService.ts");
  const getDetailBody = taskCenterSource.slice(
    taskCenterSource.indexOf("async getTaskDetail("),
    taskCenterSource.indexOf("async retryTask("),
  );
  assert.match(getDetailBody, /this\.workflowAdapter\.detail\(id\)/, "详情读取必须走适配器默认参数");
  assert.doesNotMatch(getDetailBody, /heal/, "任务中心详情读取不得隐式 heal");

  const adapterSource = readSource("services", "task", "adapters", "NovelWorkflowTaskAdapter.ts");
  assert.match(adapterSource, /heal\?: boolean;/, "heal 必须保持显式可选参数");
  assert.match(adapterSource, /options\.heal === true/, "heal 必须以显式 opt-in 触发");
  assert.doesNotMatch(adapterSource, /options\.heal !== false/, "读路径默认 heal 的旧模式不得回潮");
  const gateIndex = adapterSource.indexOf("if (options.heal === true)");
  const healCallIndex = adapterSource.indexOf("healAutoDirectorTaskState(");
  assert.ok(
    gateIndex >= 0 && healCallIndex > gateIndex,
    "适配器内唯一 heal 调用必须位于显式 opt-in 分支之后",
  );
});

test("pmr 任务详情步骤不再把当前步标为 failed", () => {
  const base = {
    lane: "auto_director",
    novelId: "novel-guard",
    currentItemKey: "chapter_detail_bundle",
    checkpointType: null,
    directorSessionPhase: null,
    createdAt: "2026-10-17T08:00:00.000Z",
    updatedAt: "2026-10-17T08:30:00.000Z",
  };

  const pmrQueuedSteps = buildNovelWorkflowDetailSteps({
    ...base,
    status: "queued",
    pendingManualRecovery: true,
  });
  assert.equal(
    pmrQueuedSteps.some((step) => step.status === "failed"),
    false,
    "pmr 时步骤区不得出现 failed 步骤",
  );
  assert.ok(
    pmrQueuedSteps.some((step) => step.status === "running"),
    "pmr 时应保留当前步骤的进行中/等待语义",
  );

  const pmrFailedInputSteps = buildNovelWorkflowDetailSteps({
    ...base,
    status: "failed",
    pendingManualRecovery: true,
  });
  assert.equal(
    pmrFailedInputSteps.some((step) => step.status === "failed"),
    false,
    "pmr 守卫必须独立于 status 输入,等待恢复不是失败",
  );

  const failedSteps = buildNovelWorkflowDetailSteps({
    ...base,
    status: "failed",
    pendingManualRecovery: false,
  });
  assert.ok(
    failedSteps.some((step) => step.status === "failed"),
    "非 pmr 的 failed 任务仍应在步骤区标出失败(证明断言不是永真式)",
  );
});

test("有 pendingManualRecovery 列的 kind 都把 pmr 值原样投影到 summary", async () => {
  // novel_workflow 的 pmr 组合投影由上面的用例覆盖;此处守住其余 4 个有列 kind 的「有列即出」。
  const kinds = ["book_analysis", "novel_pipeline", "image_generation", "style_extraction"];
  for (const kind of kinds) {
    assert.ok(PMR_COLUMN_KINDS.includes(kind), `${kind} 应登记在 pmr 列白名单`);
    const summaries = await loadKindSummaries(kind);
    assert.equal(summaries.length, 1, `${kind}: 期望投影出 1 条任务记录`);
    assert.equal(
      summaries[0].pendingManualRecovery,
      true,
      `${kind}: summary 必须携带存储行中的 pendingManualRecovery 值(有列即出)`,
    );
  }
});

test("displayStatus 不再输出英文失败文案,质量提醒分支输出中文", () => {
  const source = readSource("services", "novel", "pipelineJobState.ts");
  assert.doesNotMatch(
    source,
    /Failed with generation alerts/,
    "任务状态文案必须是用户可读的中文,不得漏出英文实现注释",
  );
  const { decoratePipelineJob } = require("../dist/services/novel/pipelineJobState.js");

  const runningWithQuality = decoratePipelineJob({
    status: "running",
    payload: JSON.stringify({ qualityAlertDetails: ["第 3 章节奏偏慢"] }),
  });
  assert.equal(runningWithQuality.displayStatus, "存在待处理的质量提醒");
  assert.equal(runningWithQuality.noticeCode, "PIPELINE_QUALITY_REVIEW");

  const succeededWithQuality = decoratePipelineJob({
    status: "succeeded",
    payload: JSON.stringify({ qualityAlertDetails: ["第 3 章节奏偏慢"] }),
  });
  assert.equal(succeededWithQuality.displayStatus, "已记录质量债务");

  const plain = decoratePipelineJob({ status: "running", payload: null });
  assert.equal(plain.displayStatus, null, "无质量债/重规划时不产出 displayStatus");
});

test("overview.attentionCount 与前端 must-handle 保持同一口径", () => {
  const serviceSource = readSource("services", "task", "TaskCenterService.ts");
  assert.match(serviceSource, /attentionCount,/, "overview 必须输出 attentionCount");
  assert.match(serviceSource, /private async countAttentionTasks\(/, "attentionCount 必须有独立计算入口");

  const codeList = serviceSource.match(/const QUALITY_REMINDER_FAILURE_CODES = \[([^\]]*)\]/);
  assert.ok(codeList, "服务端必须显式声明「纯质量提醒失败」排除码");

  const clientRoot = path.resolve(repoRoot, "..", "client", "src");
  const clientUtils = fs.readFileSync(path.join(clientRoot, "pages", "tasks", "taskCenterUtils.ts"), "utf8");
  const clientFn = clientUtils.slice(
    clientUtils.indexOf("export function isTaskFailureQualityReminder"),
    clientUtils.indexOf("export function isTaskQueueQualityReminder"),
  );
  assert.ok(clientFn.length > 0, "前端必须保留 must-handle 质量码判定");
  for (const code of ["PIPELINE_QUALITY_REVIEW", "CHAPTER_TITLE_DIVERSITY"]) {
    assert.ok(codeList[1].includes(`"${code}"`), `服务端质量提醒排除码缺 ${code}`);
    assert.ok(clientFn.includes(code), `前端质量码 ${code} 必须与服务端同口径`);
  }

  assert.ok(
    serviceSource.includes("{ pendingManualRecovery: true }"),
    "attentionCount 必须计入待手动恢复任务",
  );
  assert.ok(
    serviceSource.includes('checkpointType: "replan_required"'),
    "attentionCount 必须计入需要重规划任务",
  );

  const pageSource = fs.readFileSync(path.join(clientRoot, "pages", "tasks", "TaskCenterPage.tsx"), "utf8");
  const sidebarSource = fs.readFileSync(path.join(clientRoot, "components", "layout", "Sidebar.tsx"), "utf8");
  assert.match(pageSource, /attentionCount/, "任务中心页必须消费 overview.attentionCount 单一口径");
  assert.match(sidebarSource, /attentionCount/, "侧边栏徽标必须消费 overview.attentionCount 单一口径");
});
