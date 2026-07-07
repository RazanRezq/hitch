import { describe, it, expect, beforeEach, vi } from 'vitest';

type Processor = (job: { name: string; data: unknown }) => Promise<unknown>;

const h = vi.hoisted(() => ({
  processor: undefined as Processor | undefined,
  dispatchBooking: vi.fn(),
  timeoutSearchingBooking: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Worker: class {
    constructor(_name: string, processor: Processor) {
      h.processor = processor;
    }
    async close() {}
  },
  Queue: class {
    add = vi.fn();
    async close() {}
  },
}));
vi.mock('@/server/lib/redis', () => ({ redis: {} }));
vi.mock('ioredis', () => {
  class FakeRedis {}
  return { default: FakeRedis, Redis: FakeRedis };
});
vi.mock('@/server/services/dispatch', () => ({
  dispatchBooking: h.dispatchBooking,
  timeoutSearchingBooking: h.timeoutSearchingBooking,
}));

// Side-effect import: runs `new Worker(...)`, which captures the processor.
import './dispatch.worker';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dispatch worker routing', () => {
  it("routes 'offer' jobs to dispatchBooking", async () => {
    if (!h.processor) throw new Error('processor not captured');
    await h.processor({ name: 'offer', data: { bookingId: 'bk_1' } });
    expect(h.dispatchBooking).toHaveBeenCalledWith('bk_1');
    expect(h.timeoutSearchingBooking).not.toHaveBeenCalled();
  });

  it("routes 'timeout' jobs to timeoutSearchingBooking", async () => {
    if (!h.processor) throw new Error('processor not captured');
    await h.processor({ name: 'timeout', data: { bookingId: 'bk_1' } });
    expect(h.timeoutSearchingBooking).toHaveBeenCalledWith('bk_1');
    expect(h.dispatchBooking).not.toHaveBeenCalled();
  });
});
