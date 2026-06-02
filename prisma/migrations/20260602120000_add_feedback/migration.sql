-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "carNumber" TEXT,
    "driverName" TEXT,
    "incidentLocation" TEXT,
    "pickupLocation" TEXT,
    "dropoffLocation" TEXT,
    "incidentDateTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "requestRefund" BOOLEAN NOT NULL DEFAULT false,
    "notifyAuthorities" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Feedback_email_idx" ON "Feedback"("email");
