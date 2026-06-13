import type { Context, MiddlewareHandler } from 'hono';
import type { UserRole } from '@/lib/types';
import { prisma } from '@/lib/db';
import { getClerkUserId } from './index';

export interface AuthVariables {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string | null;
  };
}

/**
 * Verifies the Clerk session on the request and attaches the matching Postgres
 * `User` as `c.get('user')`. 401 if not signed in, or signed in but not yet
 * synced into Postgres (the Clerk webhook creates the row). Works in both the
 * Next-mounted API and the standalone WS process.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const clerkUserId = await getClerkUserId(c.req.raw);
  if (!clerkUserId) return c.json({ error: 'Unauthorized' }, 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true, email: true, role: true, name: true },
  });
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  c.set('user', { id: user.id, email: user.email, role: user.role, name: user.name });
  await next();
};

/** Role guard. Use after `requireAuth`. */
export function requireRole(allowed: readonly UserRole[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get('user') as AuthVariables['user'] | undefined;
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (!allowed.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}

export type HonoWithAuth = Context<{ Variables: AuthVariables }>;
