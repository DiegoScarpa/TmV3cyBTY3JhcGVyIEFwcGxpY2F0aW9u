-- Business intelligence analysis and hierarchical topic taxonomy.
CREATE TABLE "StoryAnalysis" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "directImpact" JSONB NOT NULL,
    "indirectImpact" JSONB NOT NULL,
    "peopleImpact" JSONB NOT NULL,
    "geographicImpact" JSONB NOT NULL,
    "assetImpact" JSONB NOT NULL,
    "impactMap" JSONB NOT NULL,
    "followTheMoney" JSONB NOT NULL,
    "supplyChain" JSONB NOT NULL,
    "companyRelationships" JSONB NOT NULL,
    "entityDetails" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "parentId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryTopic" (
    "storyId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "StoryTopic_pkey" PRIMARY KEY ("storyId", "topicId")
);

CREATE UNIQUE INDEX "StoryAnalysis_storyId_key" ON "StoryAnalysis"("storyId");
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");
CREATE INDEX "Topic_group_idx" ON "Topic"("group");
CREATE INDEX "Topic_parentId_idx" ON "Topic"("parentId");
CREATE INDEX "StoryTopic_topicId_idx" ON "StoryTopic"("topicId");

ALTER TABLE "StoryAnalysis" ADD CONSTRAINT "StoryAnalysis_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryTopic" ADD CONSTRAINT "StoryTopic_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryTopic" ADD CONSTRAINT "StoryTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
