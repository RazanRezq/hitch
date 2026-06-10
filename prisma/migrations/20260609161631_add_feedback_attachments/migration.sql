-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
