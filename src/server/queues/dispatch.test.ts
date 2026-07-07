import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({
  add: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Queue: class {
    add = h.add;
    async close() {}
  },
}));
vi.mock('@/server/lib/redis', () => ({ redis: {} }));
vi.mock('ioredis', () => {
  class FakeRedis {}
  return { default: FakeRedis, Redis: FakeRedis };
});

import { computeDispatchDelayMs, dispatchLeadMinutes, enqueueDispatch } from './dispatch';

const NOW = new Date('2026-07-15T12:00:00Z');
const HOUR = 60 * 60_000;

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('computeDispatchDelayMs', () => {
  it('is zero for ASAP / past / within-lead-window trips', () => {
    expect(computeDispatchDelayMs(NOW, NOW)).toBe(0);
    expect(computeDispatchDelayMs(new Date(NOW.getTime() - HOUR), NOW)).toBe(0);
    // 45 min out, 60 min lead — already inside the window
    expect(computeDispatchDelayMs(new Date(NOW.getTime() + 0.75 * HOUR), NOW)).toBe(0);
  });

  it('holds a future trip until scheduledTime minus the lead', () => {
    // Tomorrow 09:00 pickup, quoted at noon today → fires at 08:00 tomorrow
    const pickup = new Date(NOW.getTime() + 21 * HOUR);
    expect(computeDispatchDelayMs(pickup, NOW)).toBe(20 * HOUR);
  });

  it('accepts ISO strings and is defensively zero on missing/invalid dates', () => {
    expect(computeDispatchDelayMs('2026-07-16T09:00:00Z', NOW)).toBe(20 * HOUR);
    expect(computeDispatchDelayMs(null, NOW)).toBe(0);
    expect(computeDispatchDelayMs(undefined, NOW)).toBe(0);
    expect(computeDispatchDelayMs('not-a-date', NOW)).toBe(0);
  });

  it('respects DISPATCH_LEAD_MINUTES and falls back to 60 on unset/invalid', () => {
    expect(dispatchLeadMinutes()).toBe(60);
    vi.stubEnv('DISPATCH_LEAD_MINUTES', '120');
    expect(dispatchLeadMinutes()).toBe(120);
    const pickup = new Date(NOW.getTime() + 3 * HOUR);
    expect(computeDispatchDelayMs(pickup, NOW)).toBe(1 * HOUR);
    vi.stubEnv('DISPATCH_LEAD_MINUTES', '');
    expect(dispatchLeadMinutes()).toBe(60);
    vi.stubEnv('DISPATCH_LEAD_MINUTES', '-5');
    expect(dispatchLeadMinutes()).toBe(60);
  });
});

describe('enqueueDispatch', () => {
  it('passes the delay through to BullMQ with the dedupe jobId', async () => {
    await enqueueDispatch('bk_1', 5000);
    expect(h.add).toHaveBeenCalledWith(
      'offer',
      { bookingId: 'bk_1' },
      expect.objectContaining({ jobId: 'dispatch:bk_1', delay: 5000 }),
    );
  });

  it('defaults to immediate dispatch', async () => {
    await enqueueDispatch('bk_2');
    expect(h.add).toHaveBeenCalledWith(
      'offer',
      { bookingId: 'bk_2' },
      expect.objectContaining({ delay: 0 }),
    );
  });
});
