-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('TOURNAMENT', 'CLINIC', 'TEAM_RECRUITMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CampaignSlotPhase" AS ENUM ('PRE', 'DURING', 'POST');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" "CampaignObjective" NOT NULL,
    "eventStartDate" TIMESTAMP(3) NOT NULL,
    "eventEndDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignContentSlot" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "phase" "CampaignSlotPhase" NOT NULL,
    "label" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "plannerItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignContentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignContentSlot_plannerItemId_key" ON "CampaignContentSlot"("plannerItemId");

-- CreateIndex
CREATE INDEX "CampaignContentSlot_campaignId_idx" ON "CampaignContentSlot"("campaignId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContentSlot" ADD CONSTRAINT "CampaignContentSlot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignContentSlot" ADD CONSTRAINT "CampaignContentSlot_plannerItemId_fkey" FOREIGN KEY ("plannerItemId") REFERENCES "PlannerItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
