-- Drop the legacy Better Auth tables. Authentication is handled by Clerk
-- (account auth) + HMAC guest tokens; these tables are no longer referenced by
-- any code. See PROJECT_OVERVIEW.md and prisma/schema.prisma.
DROP TABLE IF EXISTS "Verification" CASCADE;
DROP TABLE IF EXISTS "Session" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
