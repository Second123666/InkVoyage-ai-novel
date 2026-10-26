import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  WORKFLOW_DISPLAY_STAGES,
  WORKFLOW_STEP_CATALOG,
} from "@ai-novel/shared/types/directorWorkflowStepCatalog";
import {
  buildWorkflowStepGraphModel,
  resolveHighlightedStepIds,
} from "../src/pages/autoDirectorFollowUps/workflowStepGraphLayout.ts";

// UI-7 工作流步骤图守卫:确定性布局、依赖边完整性、当前阶段高亮与懒加载纪律。
const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("步骤图布局:覆盖全量步骤、坐标确定、依赖边完整", () => {
  const model = buildWorkflowStepGraphModel();
  assert.equal(model.nodes.length, WORKFLOW_STEP_CATALOG.length, "必须覆盖全部步骤");
  assert.equal(new Set(model.nodes.map((node) => node.id)).size, model.nodes.length, "节点 id 必须唯一");

  const stageLabels = new Map(WORKFLOW_DISPLAY_STAGES.map((stage) => [stage.key, stage.label]));
  for (const node of model.nodes) {
    assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y), `节点 ${node.id} 坐标必须有限`);
    assert.equal(node.stageLabel, stageLabels.get(node.stage), `节点 ${node.id} 的阶段名必须与展示阶段一致`);
  }

  const expectedEdgeCount = WORKFLOW_STEP_CATALOG.reduce(
    (count, entry) => count + (entry.prerequisiteStepIds ?? []).filter((id) => WORKFLOW_STEP_CATALOG.some((item) => item.id === id)).length,
    0,
  );
  assert.equal(model.edges.length, expectedEdgeCount, "每个前置步骤都必须生成一条依赖边");
  const nodeIds = new Set(model.nodes.map((node) => node.id));
  for (const edge of model.edges) {
    assert.ok(nodeIds.has(edge.source) && nodeIds.has(edge.target), `依赖边 ${edge.id} 必须连接已存在的步骤`);
  }

  const rebuilt = buildWorkflowStepGraphModel();
  assert.deepEqual(rebuilt, model, "布局必须确定且可复现");
});

test("步骤图高亮:检查点优先,其次按当前阶段", () => {
  const candidateIds = resolveHighlightedStepIds({ checkpoint: "candidate_selection_required" });
  assert.ok(candidateIds.length > 0, "候选检查点必须有对应步骤");
  for (const id of candidateIds) {
    const entry = WORKFLOW_STEP_CATALOG.find((item) => item.id === id);
    assert.equal(entry.checkpoint, "candidate_selection_required");
  }

  const chapterIds = resolveHighlightedStepIds({ stage: "chapter_execution" });
  assert.ok(chapterIds.length > 0, "章节执行阶段必须有对应步骤");
  for (const id of chapterIds) {
    const entry = WORKFLOW_STEP_CATALOG.find((item) => item.id === id);
    assert.equal(entry.displayStage, "chapter_execution");
  }

  assert.deepEqual(resolveHighlightedStepIds({}), [], "没有上下文时不误高亮");
});

test("步骤图接入:懒加载画布、React Flow 画布与 dagre 布局分离", async () => {
  const page = await read("src/pages/autoDirectorFollowUps/AutoDirectorFollowUpCenterPage.tsx");
  assert.match(page, /lazy\(\(\) => import\("\.\/components\/WorkflowStepGraphCanvas"\)\)/, "步骤图必须按需懒加载");
  assert.match(page, /查看步骤图/, "导演跟进页必须提供步骤图入口");
  assert.match(page, /highlightCheckpoint=/, "选中任务后必须把当前检查点传给画布");

  const canvas = await read("src/pages/autoDirectorFollowUps/components/WorkflowStepGraphCanvas.tsx");
  assert.match(canvas, /from "@xyflow\/react"/, "画布必须使用既有可视化栈依赖");
  assert.match(canvas, /buildWorkflowStepGraphModel/, "画布必须复用纯函数布局");
  assert.doesNotMatch(canvas, /#[0-9a-fA-F]{6}/, "画布不得新增硬编码色");

  const layout = await read("src/pages/autoDirectorFollowUps/workflowStepGraphLayout.ts");
  assert.match(layout, /from "dagre"/, "步骤图布局使用既有 dagre 依赖");
  assert.match(layout, /prerequisiteStepIds/, "依赖边必须来自 step catalog 的编排元数据");
});
