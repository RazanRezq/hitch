-- AlterEnum
-- Remove the `ar` value from the Locale enum. Postgres cannot drop an enum
-- value in place, so the type is recreated and columns are migrated across.
BEGIN;
CREATE TYPE "Locale_new" AS ENUM ('is', 'en');
ALTER TABLE "User" ALTER COLUMN "preferredLocale" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "preferredLocale" TYPE "Locale_new" USING ("preferredLocale"::text::"Locale_new");
ALTER TYPE "Locale" RENAME TO "Locale_old";
ALTER TYPE "Locale_new" RENAME TO "Locale";
DROP TYPE "Locale_old";
ALTER TABLE "User" ALTER COLUMN "preferredLocale" SET DEFAULT 'is';
COMMIT;
