import type { Context, MiddlewareHandler } from 'hono';
import { redis } from '@/server/lib/redis';

/**
 * Fixed-window Redis rate limit, keyed per client IP. Protects the public,
 * unauthenticated endpoints whose work is expensive or quota-bound (Google
 * Directions on quotes, Stripe intents on bookings, Spaces presigns on
 * uploads) from abuse.
 *
 * Fail-open by design: a Redis hiccup must never block a passenger from
 * quoting or booking — the error is logged and the request proceeds.
 */

interface RateLimitOptions {
  /** Redis key namespace, e.g. `quotes` → keys `rl:quotes:{ip}`. */
  prefix: string;
  /** Max requests per window per IP. */
  limit: number;
  /** Window length in seconds (default 60). */
  windowSeconds?: number;
}

/** First hop of x-forwarded-for (Railway terminates TLS in front of us). */
export function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return c.req.header('x-real-ip') ?? 'unknown';
}

/**
 * Consume one slot from the caller's window. Returns `true` when the request
 * is allowed, `false` when over the limit. Fail-open: Redis errors allow the
 * request. Exposed separately from the middleware for handlers that must
 * order the check after other logic (e.g. the feedback honeypot, which
 * pretends success before the limit so bots don't learn it exists).
 */
export async function consumeRateLimit(
  c: Context,
  { prefix, limit, windowSeconds = 60 }: RateLimitOptions,
): Promise<boolean> {
  const key = `rl:${prefix}:${clientIp(c)}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  } catch (err) {
    console.error(`[rate-limit] redis unavailable for ${prefix} — failing open`, err);
    return true;
  }
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  return async (c, next) => {
    if (!(await consumeRateLimit(c, options))) {
      return c.json(
        { error: 'Too many requests. Please try again shortly.', code: 'RATE_LIMITED' },
        429,
      );
    }
    await next();
  };
}
