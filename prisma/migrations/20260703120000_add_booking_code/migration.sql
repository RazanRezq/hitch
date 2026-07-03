-- AlterTable
-- Human-friendly booking code (HTCH-XXXX-XXXX), generated server-side. Nullable
-- + additive so the migration is safe against any pre-existing Booking rows;
-- every new booking sets it.
ALTER TABLE "Booking" ADD COLUMN "code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");
