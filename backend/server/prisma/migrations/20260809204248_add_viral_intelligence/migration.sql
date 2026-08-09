-- CreateEnum
CREATE TYPE "TrendSource" AS ENUM ('TIKTOK', 'INSTAGRAM', 'YOUTUBE', 'MANUAL');

-- CreateEnum
CREATE TYPE "TrendStatus" AS ENUM ('NEW', 'RISING', 'HOT', 'STABLE', 'DECLINING', 'EXPIRED');

-- CreateTable
CREATE TABLE "Trend" (
    "id" TEXT NOT NULL,
    "source" "TrendSource" NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "authorHandle" TEXT NOT NULL,
    "authorFollowers" INTEGER NOT NULL,
    "authorMedianViews" INTEGER,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "hashtags" TEXT[],
    "durationSec" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "shares" INTEGER NOT NULL,
    "saves" INTEGER NOT NULL,
    "viralScore" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "relativePerformance" DOUBLE PRECISION,
    "status" "TrendStatus" NOT NULL DEFAULT 'NEW',
    "scoredAt" TIMESTAMP(3),
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendPattern" (
    "id" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "ctaType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedTrend" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendAdaptation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trendId" TEXT NOT NULL,
    "campaignId" TEXT,
    "model" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannerItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendAdaptation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trend_viralScore_idx" ON "Trend"("viralScore");

-- CreateIndex
CREATE INDEX "Trend_fingerprint_idx" ON "Trend"("fingerprint");

-- CreateIndex
CREATE INDEX "Trend_isDemo_idx" ON "Trend"("isDemo");

-- CreateIndex
CREATE UNIQUE INDEX "Trend_source_externalId_key" ON "Trend"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "TrendPattern_trendId_key" ON "TrendPattern"("trendId");

-- CreateIndex
CREATE INDEX "TrendPattern_format_idx" ON "TrendPattern"("format");

-- CreateIndex
CREATE INDEX "SavedTrend_trendId_idx" ON "SavedTrend"("trendId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTrend_organizationId_trendId_key" ON "SavedTrend"("organizationId", "trendId");

-- CreateIndex
CREATE UNIQUE INDEX "TrendAdaptation_plannerItemId_key" ON "TrendAdaptation"("plannerItemId");

-- CreateIndex
CREATE INDEX "TrendAdaptation_organizationId_createdAt_idx" ON "TrendAdaptation"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "TrendPattern" ADD CONSTRAINT "TrendPattern_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrend" ADD CONSTRAINT "SavedTrend_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrend" ADD CONSTRAINT "SavedTrend_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendAdaptation" ADD CONSTRAINT "TrendAdaptation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendAdaptation" ADD CONSTRAINT "TrendAdaptation_trendId_fkey" FOREIGN KEY ("trendId") REFERENCES "Trend"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendAdaptation" ADD CONSTRAINT "TrendAdaptation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendAdaptation" ADD CONSTRAINT "TrendAdaptation_plannerItemId_fkey" FOREIGN KEY ("plannerItemId") REFERENCES "PlannerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
