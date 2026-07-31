-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "resultNotes" TEXT,
ADD COLUMN     "resultRecordedAt" TIMESTAMP(3),
ADD COLUMN     "resultValue" INTEGER;
