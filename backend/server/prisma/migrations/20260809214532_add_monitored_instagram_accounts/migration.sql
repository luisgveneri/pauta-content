-- AlterTable
ALTER TABLE "Trend" ALTER COLUMN "durationSec" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MonitoredInstagramAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoredInstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonitoredInstagramAccount_organizationId_idx" ON "MonitoredInstagramAccount"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoredInstagramAccount_organizationId_username_key" ON "MonitoredInstagramAccount"("organizationId", "username");

-- AddForeignKey
ALTER TABLE "MonitoredInstagramAccount" ADD CONSTRAINT "MonitoredInstagramAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
