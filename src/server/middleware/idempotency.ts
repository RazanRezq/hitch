import type { MiddlewareHandler } from 'hono';
import { redis } from '../lib/redis';

/**
 * Enforces Idempotency-Key on mutating requests. Caches successful (2xx)
 * responses by key for 24h and replays them — body AND status code — for
 * subsequent identical requests. Error responses are NOT cached, so the
 * caller can retry the same key once they fix the input.
 * See CLAUDE.md "Critical Payment Safety Rules".
 */
export const idempotencyMiddleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD') {
    return next();
  }

  const key = c.req.header('idempotency-key');
  if (!key) return next();

  const cacheKey = `idemv2:${key}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      const { status, body } = JSON.parse(cached) as { status: number; body: string };
      return new Response(body, {
        status,
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      // Corrupted entry — fall through and re-run the handler.
    }
  }

  await next();

  const res = c.res;
  if (res.status >= 200 && res.status < 300) {
    const body = await res.clone().text();
    await redis.set(
      cacheKey,
      JSON.stringify({ status: res.status, body }),
      'EX',
      60 * 60 * 24,
    );
  }
};
