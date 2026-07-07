import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/lib/types';

const h = vi.hoisted(() => ({
  prisma: {
    booking: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    payment: { findFirst: vi.fn(), update: vi.fn() },
    bookingEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  publishBookingUpdate: vi.fn(),
  publishDispatchEvent: vi.fn(),
  voidPaymentIntent: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  enqueueDispatchTimeout: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: h.prisma }));
vi.mock('@/server/realtime/publish-booking', () => ({
  publishBookingUpdate: h.publishBookingUpdate,
}));
vi.mock('@/server/realtime/publish-dispatch', () => ({
  publishDispatchEvent: h.publishDispatchEvent,
}));
vi.mock('@/server/services/payments', () => ({
  voidPaymentIntent: h.voidPaymentIntent,
  retrievePaymentIntent: h.retrievePaymentIntent,
}));
vi.mock('@/server/queues/dispatch', async (importOriginal) => {
  // Keep noDriverTimeoutMinutes (pure) — only the producer is faked.
  const actual = await importOriginal<typeof import('@/server/queues/dispatch')>();
  return { ...actual, enqueueDispatchTimeout: h.enqueueDispatchTimeout };
});
vi.mock('bullmq', () => ({
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

import { dispatchBooking, timeoutSearchingBooking } from './index';

const PAYMENT = {
  id: 'pay_1',
  bookingId: 'bk_1',
  stripeIntentId: 'pi_1',
  status: PAYMENT_STATUSES.REQUIRES_CAPTURE,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.prisma.$transaction.mockImplementation(async (ops: unknown) => ops);
  h.prisma.booking.update.mockResolvedValue({});
  h.prisma.booking.updateMany.mockResolvedValue({ count: 1 });
  h.prisma.payment.update.mockResolvedValue({});
  h.prisma.bookingEvent.create.mockResolvedValue({});
  h.enqueueDispatchTimeout.mockResolvedValue(undefined);
  h.voidPaymentIntent.mockResolvedValue({});
});

describe('dispatchBooking', () => {
  it('advances CONFIRMED → SEARCHING and arms the no-driver timeout', async () => {
    h.prisma.booking.findUnique.mockResolvedValue({
      id: 'bk_1',
      status: BOOKING_STATUSES.CONFIRMED,
    });

    await dispatchBooking('bk_1');

    expect(h.prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: BOOKING_STATUSES.SEARCHING } }),
    );
    expect(h.publishBookingUpdate).toHaveBeenCalledWith('bk_1', BOOKING_STATUSES.SEARCHING);
    expect(h.enqueueDispatchTimeout).toHaveBeenCalledWith('bk_1');
  });

  it('no-ops (and arms nothing) when the booking is not CONFIRMED', async () => {
    h.prisma.booking.findUnique.mockResolvedValue({
      id: 'bk_1',
      status: BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
    });

    await dispatchBooking('bk_1');

    expect(h.prisma.booking.update).not.toHaveBeenCalled();
    expect(h.enqueueDispatchTimeout).not.toHaveBeenCalled();
  });
});

describe('timeoutSearchingBooking', () => {
  function searching() {
    h.prisma.booking.findUnique.mockResolvedValue({
      id: 'bk_1',
      status: BOOKING_STATUSES.SEARCHING,
    });
    h.prisma.payment.findFirst.mockResolvedValue(PAYMENT);
  }

  it('voids the auth, cancels the booking, and clears the queue', async () => {
    searching();

    await timeoutSearchingBooking('bk_1');

    expect(h.voidPaymentIntent).toHaveBeenCalledWith({
      intentId: 'pi_1',
      idempotencyKey: 'timeout:bk_1:void',
    });
    expect(h.prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'bk_1', status: BOOKING_STATUSES.SEARCHING },
      data: expect.objectContaining({ status: BOOKING_STATUSES.CANCELLED_BY_SYSTEM }),
    });
    expect(h.prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: PAYMENT_STATUSES.CANCELED } }),
    );
    expect(h.prisma.bookingEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'STATUS_CHANGED',
          payload: expect.objectContaining({ reason: 'no_driver_timeout' }),
        }),
      }),
    );
    expect(h.publishBookingUpdate).toHaveBeenCalledWith(
      'bk_1',
      BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
    );
    expect(h.publishDispatchEvent).toHaveBeenCalledWith({
      type: 'dispatch',
      action: 'removed',
      bookingId: 'bk_1',
    });
  });

  it.each([
    BOOKING_STATUSES.ACCEPTED,
    BOOKING_STATUSES.COMPLETED,
    BOOKING_STATUSES.CANCELLED_BY_PASSENGER,
  ])('no-ops when the booking is %s (assigned/cancelled meanwhile)', async (status) => {
    h.prisma.booking.findUnique.mockResolvedValue({ id: 'bk_1', status });

    await timeoutSearchingBooking('bk_1');

    expect(h.voidPaymentIntent).not.toHaveBeenCalled();
    expect(h.prisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('leaves the booking alone when the void loses the race to a capture', async () => {
    searching();
    h.voidPaymentIntent.mockRejectedValue(new Error('cannot cancel captured intent'));
    h.retrievePaymentIntent.mockResolvedValue({ status: 'succeeded' });

    await timeoutSearchingBooking('bk_1');

    expect(h.prisma.booking.updateMany).not.toHaveBeenCalled();
    expect(h.publishBookingUpdate).not.toHaveBeenCalled();
  });

  it('proceeds when the intent was already canceled (earlier attempt)', async () => {
    searching();
    h.voidPaymentIntent.mockRejectedValue(new Error('already canceled'));
    h.retrievePaymentIntent.mockResolvedValue({ status: 'canceled' });

    await timeoutSearchingBooking('bk_1');

    expect(h.prisma.booking.updateMany).toHaveBeenCalled();
    expect(h.publishBookingUpdate).toHaveBeenCalledWith(
      'bk_1',
      BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
    );
  });

  it('rethrows transient void failures so BullMQ retries', async () => {
    searching();
    h.voidPaymentIntent.mockRejectedValue(new Error('network blip'));
    h.retrievePaymentIntent.mockResolvedValue({ status: 'requires_capture' });

    await expect(timeoutSearchingBooking('bk_1')).rejects.toThrow('network blip');
    expect(h.prisma.booking.updateMany).not.toHaveBeenCalled();
  });

  it('skips the audit trail when the claim loses (webhook cancelled it first)', async () => {
    searching();
    h.prisma.booking.updateMany.mockResolvedValue({ count: 0 });

    await timeoutSearchingBooking('bk_1');

    expect(h.prisma.bookingEvent.create).not.toHaveBeenCalled();
    expect(h.publishBookingUpdate).not.toHaveBeenCalled();
  });

  it('still cancels a booking that has no capturable payment row', async () => {
    h.prisma.booking.findUnique.mockResolvedValue({
      id: 'bk_1',
      status: BOOKING_STATUSES.SEARCHING,
    });
    h.prisma.payment.findFirst.mockResolvedValue(null);

    await timeoutSearchingBooking('bk_1');

    expect(h.voidPaymentIntent).not.toHaveBeenCalled();
    expect(h.prisma.payment.update).not.toHaveBeenCalled();
    expect(h.prisma.booking.updateMany).toHaveBeenCalled();
    expect(h.publishBookingUpdate).toHaveBeenCalledWith(
      'bk_1',
      BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
    );
  });
});
