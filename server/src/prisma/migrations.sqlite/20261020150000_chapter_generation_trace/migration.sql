CREATE TABLE "ChapterGenerationTrace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "chapterOrder" INTEGER NOT NULL,
    "runId" TEXT,
    "contextJson" TEXT NOT NULL,
    "generationJson" TEXT NOT NULL,
    "auditJson" TEXT NOT NULL,
    "decisionJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "ChapterGenerationTrace_novelId_chapterId_createdAt_idx"
ON "ChapterGenerationTrace"("novelId", "chapterId", "createdAt");

CREATE INDEX "ChapterGenerationTrace_novelId_chapterOrder_idx"
ON "ChapterGenerationTrace"("novelId", "chapterOrder");
