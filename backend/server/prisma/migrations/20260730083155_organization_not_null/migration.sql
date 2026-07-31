/*
  Warnings:

  - Made the column `organizationId` on table `Idea` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `InstagramAccount` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `PlannerItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `organizationId` on table `ViralVideo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Idea" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InstagramAccount" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PlannerItem" ALTER COLUMN "organizationId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ViralVideo" ALTER COLUMN "organizationId" SET NOT NULL;
