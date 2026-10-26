const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildStoryTimelineOverview,
} = require("../dist/modules/timeline/storyTimelineOverview.service.js");

// UI-7 故事时间线只读投影:聚合事件与伏笔、标注截断、路由挂载。
function event(id, overrides = {}) {
  return {
    id,
    novelId: "novel-1",
    eventOrder: 1,
    chapterIndex: 1,
    title: `事件 ${id}`,
    summary: "",
    type: "plot",
    status: "occurred",
    visibility: "reader_known",
    source: "chapter_extraction",
    participantIds: [],
    factionIds: [],
    prerequisiteEventIds: [],
    consequenceEventIds: [],
    stateChanges: [],
    confidence: 1,
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    ...overrides,
  };
}

function hook(id, overrides = {}) {
  return {
    id,
    novelId: "novel-1",
    createdInChapterId: "chapter-1",
    createdInChapterIndex: 1,
    resolveMode: "long_arc",
    blocking: false,
    title: `伏笔 ${id}`,
    description: "",
    status: "open",
    priority: "medium",
    relatedEventIds: [],
    participantIds: [],
    createdAt: "2026-10-26T00:00:00.000Z",
    updatedAt: "2026-10-26T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository(options = {}) {
  return {
    async listEventsForNovel(input) {
      assert.equal(input.novelId, "novel-1");
      return { items: options.events ?? [event("e1"), event("e2")], truncated: Boolean(options.eventsTruncated) };
    },
    async listHooksForNovel(input) {
      assert.equal(input.novelId, "novel-1");
      return { items: options.hooks ?? [hook("h1")], truncated: Boolean(options.hooksTruncated) };
    },
  };
}

test("故事时间线投影:聚合事件与伏笔并透出截断标记", async () => {
  const overview = await buildStoryTimelineOverview("novel-1", fakeRepository({
    eventsTruncated: true,
    hooksTruncated: false,
  }));
  assert.equal(overview.events.length, 2);
  assert.equal(overview.hooks.length, 1);
  assert.deepEqual(overview.stats, {
    eventCount: 2,
    hookCount: 1,
    eventsTruncated: true,
    hooksTruncated: false,
  });

  const empty = await buildStoryTimelineOverview("novel-1", fakeRepository({ events: [], hooks: [] }));
  assert.deepEqual(empty.stats, {
    eventCount: 0,
    hookCount: 0,
    eventsTruncated: false,
    hooksTruncated: false,
  });
});

test("故事时间线路由挂载且为只读 GET", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "app.ts"), "utf8");
  assert.match(appSource, /app\.use\("\/api\/story-timeline", storyTimelineRouter\)/, "必须挂载故事时间线路由");

  const routeSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "modules", "timeline", "http", "storyTimelineRoutes.ts"),
    "utf8",
  );
  assert.match(routeSource, /storyTimelineRouter\.get\("\//, "只暴露 GET 只读入口");
  assert.doesNotMatch(routeSource, /\.post\(|\.put\(|\.delete\(/, "时间线路由不得提供写操作");
});
