import { createClerkClient } from '@clerk/backend';

/**
 * Account auth is handled by Clerk. We use the @clerk/backend client (not
 * @clerk/nextjs) because the same Hono `app` runs in two runtimes: inside the
 * Next route handler AND in the standalone WS process (`npm run ws`). Only the
 * backend client can verify a session from a raw Request in both. See CLAUDE.md
 * "SECURITY → Authentication".
 *
 * Clerk owns identity; Postgres `User` (synced via the Clerk webhook) remains the
 * source of truth for app data + RBAC roles. Guest bookings stay token-based
 * (see lib/guestToken) and never touch Clerk.
 */
export const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

/**
 * Networkless verification of the Clerk session on a raw Request (cookie or
 * Bearer token). Returns the Clerk user id, or null if not signed in.
 */
export async function getClerkUserId(request: Request): Promise<string | null> {
  const state = await clerk.authenticateRequest(request);
  if (!state.isSignedIn) return null;
  return state.toAuth().userId ?? null;
}

export * from './middleware';
