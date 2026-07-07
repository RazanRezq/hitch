import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';

const h = vi.hoisted(() => ({
  redis: { incr: vi.fn(), expire: vi.fn() },
}));

vi.mock('@/server/lib/redis', () => ({ redis: h.redis }));

import { rateLimit } from './rate-limit';

function makeApp() {
  return new Hono().post('/', rateLimit({ prefix: 'test', limit: 3 }), (c) =>
    c.json({ ok: true }),
  );
}

function post(app: Hono, ip = '203.0.113.7') {
  return app.request('/', { method: 'POST', headers: { 'x-forwarded-for': ip } });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.redis.expire.mockResolvedValue(1);
});

describe('rateLimit middleware', () => {
  it('allows requests under the limit and 429s above it', async () => {
    const app = makeApp();
    let count = 0;
    h.redis.incr.mockImplementation(async () => ++count);

    for (let i = 0; i < 3; i++) {
      expect((await post(app)).status).toBe(200);
    }
    const limited = await post(app);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('keys by client IP (first x-forwarded-for hop) and sets the TTL once', async () => {
    const app = makeApp();
    h.redis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    await post(app, '203.0.113.7, 10.0.0.1'); // proxy chain — first hop wins
    await post(app, '203.0.113.7');
    await post(app, '198.51.100.9');

    expect(h.redis.incr).toHaveBeenNthCalledWith(1, 'rl:test:203.0.113.7');
    expect(h.redis.incr).toHaveBeenNthCalledWith(2, 'rl:test:203.0.113.7');
    expect(h.redis.incr).toHaveBeenNthCalledWith(3, 'rl:test:198.51.100.9');
    // expire only on the first hit of each window (counts 1, not 2)
    expect(h.redis.expire).toHaveBeenCalledTimes(2);
    expect(h.redis.expire).toHaveBeenCalledWith('rl:test:203.0.113.7', 60);
  });

  it('fails open when Redis is unavailable', async () => {
    const app = makeApp();
    h.redis.incr.mockRejectedValue(new Error('redis down'));

    const res = await post(app);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
