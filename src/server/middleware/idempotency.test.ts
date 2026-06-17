import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory stand-in for Redis so we exercise the real caching logic.
const h = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock('@/server/lib/redis', () => ({
  redis: {
    get: async (k: string) => h.store.get(k) ?? null,
    set: async (k: string, v: string) => {
      h.store.set(k, v);
      return 'OK';
    },
  },
}));

import { Hono } from 'hono';
import { idempotencyMiddleware } from './idempotency';

let handlerCalls = 0;

const app = new Hono();
app.use('*', idempotencyMiddleware);
app.post('/echo', (c) => {
  handlerCalls += 1;
  return c.json({ n: handlerCalls });
});
app.post('/fail', (c) => {
  handlerCalls += 1;
  return c.json({ error: 'bad input' }, 400);
});

function post(pathname: string, key?: string) {
  return app.request(pathname, {
    method: 'POST',
    headers: key ? { 'idempotency-key': key } : {},
  });
}

beforeEach(() => {
  h.store.clear();
  handlerCalls = 0;
});

describe('idempotency middleware', () => {
  it('replays the cached 2xx response and skips the handler on a repeat key', async () => {
    const first = await post('/echo', 'k1');
    expect(await first.json()).toEqual({ n: 1 });
    expect(handlerCalls).toBe(1);

    const second = await post('/echo', 'k1');
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ n: 1 }); // identical body, not n:2
    expect(handlerCalls).toBe(1); // handler did NOT run a second time
  });

  it('runs the handler every time when no key is provided', async () => {
    await post('/echo');
    await post('/echo');
    expect(handlerCalls).toBe(2);
  });

  it('treats distinct keys independently', async () => {
    await post('/echo', 'a');
    await post('/echo', 'b');
    expect(handlerCalls).toBe(2);
  });

  it('does NOT cache error responses, so the same key can be retried', async () => {
    const first = await post('/fail', 'kx');
    expect(first.status).toBe(400);
    const second = await post('/fail', 'kx');
    expect(second.status).toBe(400);
    expect(handlerCalls).toBe(2);
  });
});
