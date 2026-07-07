import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/lib/types';

type Processor = (job: { data: unknown }) => Promise<unknown>;

const h = vi.hoisted(() => ({
  processor: undefined as Processor | undefined,
  prisma: {
    webhookEvent: { findUnique: vi.fn(), update: vi.fn() },
    payment: { findUnique: vi.fn(), update: vi.fn() },
    booking: { findUnique: vi.fn(), update: vi.fn() },
    bookingEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  publishBookingUpdate: vi.fn(),
  enqueueDispatch: vi.fn(),
  notifyBookingConfirmed: vi.fn(),
}));

// Capture the BullMQ processor instead of starting a real Worker/Redis.
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
    async upsertJobScheduler() {}
  },
}));
vi.mock('@/server/lib/redis', () => ({ redis: {} }));
vi.mock('ioredis', () => {
  class FakeRedis {}
  return { default: FakeRedis, Redis: FakeRedis };
});
vi.mock('@/lib/db', () => ({ prisma: h.prisma }));
vi.mock('@/server/realtime/publish-booking', () => ({
  publishBookingUpdate: h.publishBookingUpdate,
}));
vi.mock('@/server/queues/dispatch', () => ({ enqueueDispatch: h.enqueueDispatch }));
vi.mock('@/server/services/booking/notify', () => ({
  notifyBookingConfirmed: h.notifyBookingConfirmed,
}));

// Side-effect import: runs `new Worker(...)`, which captures the processor.
import './webhook.worker';

function run(webhookEventId = 'whe_1') {
  if (!h.processor) throw new Error('worker processor was not captured');
  return h.processor({ data: { webhookEventId } });
}

function authorizedEvent() {
  return {
    type: 'payment_intent.amount_capturable_updated',
    data: { object: { id: 'pi_1', amount: 13900, currency: 'isk' } },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.prisma.$transaction.mockImplementation(async (ops: unknown) => ops);
  h.prisma.webhookEvent.update.mockResolvedValue({});
  h.prisma.booking.update.mockResolvedValue({});
  h.prisma.payment.update.mockResolvedValue({});
  h.prisma.bookingEvent.create.mockResolvedValue({});
  h.enqueueDispatch.mockResolvedValue(undefined);
  h.notifyBookingConfirmed.mockResolvedValue(undefined);
});

describe('webhook worker', () => {
  it('advances PENDING_PAYMENT → CONFIRMED and enqueues dispatch on authorization', async () => {
    h.prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'whe_1',
      status: 'pending',
      payload: authorizedEvent(),
    });
    h.prisma.payment.findUnique.mockResolvedValue({ id: 'pay_1', bookingId: 'bk_1' });
    h.prisma.booking.findUnique.mockResolvedValue({
      id: 'bk_1',
      status: BOOKING_STATUSES.PENDING_PAYMENT,
    });

    await run();

    expect(h.prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk_1' },
        data: { status: BOOKING_STATUSES.CONFIRMED },
      }),
    );
    expect(h.prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: PAYMENT_STATUSES.REQUIRES_CAPTURE } }),
    );
    expect(h.publishBookingUpdate).toHaveBeenCalledWith('bk_1', BOOKING_STATUSES.CONFIRMED);
    expect(h.enqueueDispatch).toHaveBeenCalledWith('bk_1');
    expect(h.notifyBookingConfirmed).toHaveBeenCalledWith('bk_1');

    const lastUpdate = h.prisma.webhookEvent.update.mock.calls.at(-1)?.[0];
    expect(lastUpdate.data.status).toBe('processed');
  });

  it('is idempotent: no-op if the booking already advanced past PENDING_PAYMENT', async () => {
    h.prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'whe_1',
      status: 'pending',
      payload: authorizedEvent(),
    });
    h.prisma.payment.findUnique.mockResolvedValue({ id: 'pay_1', bookingId: 'bk_1' });
    h.prisma.booking.findUnique.mockResolvedValue({
      id: 'bk_1',
      status: BOOKING_STATUSES.CONFIRMED,
    });

    await run();

    expect(h.prisma.booking.update).not.toHaveBeenCalled();
    expect(h.enqueueDispatch).not.toHaveBeenCalled();
    expect(h.notifyBookingConfirmed).not.toHaveBeenCalled();
  });

  // A Stripe cancel reconciles ANY pre-capture booking — including the
  // authorized-but-uncaptured ones (CONFIRMED/SEARCHING) that Stripe voids on
  // its 7-day timeout, which used to be silently skipped and left stale.
  it.each([
    BOOKING_STATUSES.PENDING_PAYMENT,
    BOOKING_STATUSES.CONFIRMED,
    BOOKING_STATUSES.SEARCHING,
  ])('cancels a pre-capture booking (%s) on payment_intent.canceled', async (status) => {
    h.prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'whe_1',
      status: 'pending',
      payload: { type: 'payment_intent.canceled', data: { object: { id: 'pi_1' } } },
    });
    h.prisma.payment.findUnique.mockResolvedValue({ id: 'pay_1', bookingId: 'bk_1' });
    h.prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status });

    await run();

    expect(h.prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk_1' },
        data: expect.objectContaining({ status: BOOKING_STATUSES.CANCELLED_BY_SYSTEM }),
      }),
    );
    expect(h.prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: PAYMENT_STATUSES.CANCELED } }),
    );
    expect(h.publishBookingUpdate).toHaveBeenCalledWith(
      'bk_1',
      BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
    );
  });

  // Captured (ACCEPTED+) and already-terminal bookings must be left untouched —
  // never clobber a completed trip or a passenger-initiated cancel.
  it.each([
    BOOKING_STATUSES.ACCEPTED,
    BOOKING_STATUSES.COMPLETED,
    BOOKING_STATUSES.CANCELLED_BY_PASSENGER,
  ])('leaves a captured/terminal booking (%s) untouched on payment_intent.canceled', async (status) => {
    h.prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'whe_1',
      status: 'pending',
      payload: { type: 'payment_intent.canceled', data: { object: { id: 'pi_1' } } },
    });
    h.prisma.payment.findUnique.mockResolvedValue({ id: 'pay_1', bookingId: 'bk_1' });
    h.prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status });

    await run();

    expect(h.prisma.booking.update).not.toHaveBeenCalled();
    expect(h.prisma.payment.update).not.toHaveBeenCalled();
    expect(h.publishBookingUpdate).not.toHaveBeenCalled();
  });

  it('records a note (no status flip) on payment_intent.payment_failed', async () => {
    h.prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'whe_1',
      status: 'pending',
      payload: {
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_1', last_payment_error: { message: 'card declined' } } },
      },
    });
    h.prisma.payment.findUnique.mockResolvedValue({ id: 'pay_1', bookingId: 'bk_1' });

    await run();

    expect(h.prisma.booking.update).not.toHaveBeenCalled();
    expect(h.prisma.bookingEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'NOTE_ADDED' }) }),
    );
  });

  it('skips an already-processed outbox row', async () => {
    h.prisma.webhookEvent.findUnique.mockResolvedValue({ id: 'whe_1', status: 'processed' });

    await run();

    expect(h.prisma.payment.findUnique).not.toHaveBeenCalled();
    expect(h.prisma.webhookEvent.update).not.toHaveBeenCalled();
  });
});
