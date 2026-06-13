import { clerkMiddleware } from '@clerk/nextjs/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Clerk populates the auth context for page routes (so server components can
// call auth()); next-intl handles locale routing. The matcher excludes /api,
// where the Hono app verifies Clerk sessions itself via @clerk/backend.
export default clerkMiddleware((_auth, req) => intlMiddleware(req));

export const config = {
  // First entry: next-intl's locale routing (also covers Clerk's /__clerk handshake,
  // which isn't api/_next/a-file). Second entry makes Clerk's auto-proxy explicit.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/__clerk/:path*'],
};
