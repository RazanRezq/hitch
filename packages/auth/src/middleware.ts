import type { Context, MiddlewareHandler } from 'hono';
import type { UserRole } from '@hitch/types';
import { auth } from './index';

export interface AuthVariables {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string | null;
  };
  sessionToken: string;
}

/**
 * Reads the current session from a Better Auth cookie/header and attaches
 * `c.get('user')`. Throws 401 if missing or invalid.
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('user', {
    id: session.user.id,
    email: session.user.email,
    role: (session.user as { role?: UserRole }).role ?? 'PASSENGER',
    name: session.user.name,
  });
  c.set('sessionToken', session.session.token);
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
