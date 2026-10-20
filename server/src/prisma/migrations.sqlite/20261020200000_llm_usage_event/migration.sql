CREATE TABLE "LlmUsageEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT,
    "taskType" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "LlmUsageEvent_novelId_createdAt_idx"
ON "LlmUsageEvent"("novelId", "createdAt");

CREATE INDEX "LlmUsageEvent_taskType_createdAt_idx"
ON "LlmUsageEvent"("taskType", "createdAt");
