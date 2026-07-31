-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CLUB', 'CREATOR');

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "InstagramAccount" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PlannerItem" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "ViralVideo" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'CLUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clerkOrgId_key" ON "Organization"("clerkOrgId");

-- CreateIndex
CREATE INDEX "Idea_organizationId_idx" ON "Idea"("organizationId");

-- CreateIndex
CREATE INDEX "InstagramAccount_organizationId_idx" ON "InstagramAccount"("organizationId");

-- CreateIndex
CREATE INDEX "PlannerItem_organizationId_idx" ON "PlannerItem"("organizationId");

-- CreateIndex
CREATE INDEX "ViralVideo_organizationId_idx" ON "ViralVideo"("organizationId");

-- AddForeignKey
ALTER TABLE "ViralVideo" ADD CONSTRAINT "ViralVideo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerItem" ADD CONSTRAINT "PlannerItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
