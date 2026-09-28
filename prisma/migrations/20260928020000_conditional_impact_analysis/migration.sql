ALTER TABLE "Source"
  ADD COLUMN "subtopics" JSONB,
  ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'RSS',
  ADD COLUMN "preferredExtraction" TEXT NOT NULL DEFAULT 'DIRECT_OR_SMRY';

ALTER TABLE "StoryAnalysis"
  ALTER COLUMN "directImpact" DROP NOT NULL,
  ALTER COLUMN "indirectImpact" DROP NOT NULL,
  ALTER COLUMN "peopleImpact" DROP NOT NULL,
  ALTER COLUMN "geographicImpact" DROP NOT NULL,
  ALTER COLUMN "assetImpact" DROP NOT NULL,
  ALTER COLUMN "impactMap" DROP NOT NULL,
  ALTER COLUMN "followTheMoney" DROP NOT NULL,
  ALTER COLUMN "supplyChain" DROP NOT NULL,
  ALTER COLUMN "companyRelationships" DROP NOT NULL,
  ALTER COLUMN "entityDetails" DROP NOT NULL;

ALTER TABLE "StoryAnalysis"
  ADD COLUMN "marketImpact" JSONB,
  ADD COLUMN "companyImpact" JSONB,
  ADD COLUMN "industryImpact" JSONB,
  ADD COLUMN "supplyChainImpact" JSONB,
  ADD COLUMN "inflationImpact" JSONB,
  ADD COLUMN "interestRateImpact" JSONB,
  ADD COLUMN "realEstateImpact" JSONB,
  ADD COLUMN "energyImpact" JSONB,
  ADD COLUMN "consumerImpact" JSONB;
