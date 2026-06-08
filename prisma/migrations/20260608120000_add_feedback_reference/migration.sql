-- AlterTable
-- Human-friendly report reference (RPT-XXXX-XXXX). Nullable + additive so the
-- migration is safe against any pre-existing Feedback rows; new rows set it.
ALTER TABLE "Feedback" ADD COLUMN "reference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_reference_key" ON "Feedback"("reference");
