import type { MiddlewareHandler } from 'hono';
import { redis } from '../lib/redis.js';

/**
 * Enforces Idempotency-Key on mutating requests. Stores the first response
 * body by key for 24h and replays it for subsequent identical requests.
 * See CLAUDE.md "Critical Payment Safety Rules".
 */
export const idempotencyMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    return next();
  }

  const key = c.req.header('idempotency-key');
  if (!key) return next();

  const cacheKey = `idem:${key}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return new Response(cached, { headers: { 'content-type': 'application/json' } });
  }

  await next();

  const clone = c.res.clone();
  const body = await clone.text();
  await redis.set(cacheKey, body, 'EX', 60 * 60 * 24);
};
