-- CreateEnum
CREATE TYPE "ReceiptSource" AS ENUM ('BOOKING', 'MANUAL');

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "source" "ReceiptSource" NOT NULL,
    "bookingId" TEXT,
    "issuedById" TEXT,
    "issuedFor" TIMESTAMP(3) NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "driverName" TEXT,
    "vehiclePlate" TEXT,
    "cabNumber" TEXT,
    "fareAmount" INTEGER NOT NULL,
    "tipAmount" INTEGER,
    "totalAmount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ISK',
    "amountISK" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");

-- CreateIndex
CREATE INDEX "Receipt_bookingId_idx" ON "Receipt"("bookingId");

-- CreateIndex
CREATE INDEX "Receipt_createdAt_idx" ON "Receipt"("createdAt");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
