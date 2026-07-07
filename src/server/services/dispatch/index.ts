import { prisma } from '@/lib/db';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/lib/types';
import { canTransition } from '@/server/services/booking/state-machine';
import { publishBookingUpdate } from '@/server/realtime/publish-booking';
import { publishDispatchEvent } from '@/server/realtime/publish-dispatch';
import { voidPaymentIntent, retrievePaymentIntent } from '@/server/services/payments';
import { enqueueDispatchTimeout, noDriverTimeoutMinutes } from '@/server/queues/dispatch';

/**
 * Dispatch a CONFIRMED booking: advance it to SEARCHING and surface it on the
 * dispatcher queue (dispatch:global). Phase 1 is MANUAL dispatch — a dispatcher
 * then assigns a driver; the auto offer/accept loop (scoring, offering to
 * driver:{id}:jobs, timeout, escalation) lands with the Phase 2 driver app.
 *
 * Runs only from the BullMQ dispatch worker — never inline (CLAUDE.md "DISPATCH
 * LOGIC"). Idempotent: no-ops if the booking already advanced or was cancelled.
 */
export async function dispatchBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  if (booking.status !== BOOKING_STATUSES.CONFIRMED) return;
  if (!canTransition(booking.status, BOOKING_STATUSES.SEARCHING)) return;

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: BOOKING_STATUSES.SEARCHING },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId,
        type: 'STATUS_CHANGED',
        payload: { from: BOOKING_STATUSES.CONFIRMED, to: BOOKING_STATUSES.SEARCHING, reason: 'dispatch' },
      },
    }),
    prisma.bookingEvent.create({
      data: { bookingId, type: 'DISPATCH_OFFERED', payload: { mode: 'manual' } },
    }),
  ]);

  publishBookingUpdate(bookingId, BOOKING_STATUSES.SEARCHING);
  publishDispatchEvent({ type: 'dispatch', action: 'enqueue', bookingId });

  // Arm the no-driver timeout. Fire-and-forget: a scheduling hiccup must not
  // fail the dispatch job itself (Stripe's 7-day auto-cancel still backstops).
  void enqueueDispatchTimeout(bookingId).catch((err) =>
    console.error('[dispatch] enqueueDispatchTimeout failed', bookingId, err),
  );
}

/**
 * No-driver timeout: a booking still SEARCHING when this fires gets its
 * uncaptured auth voided and the booking cancelled (CLAUDE.md "No driver in
 * X min → VOID auth → CANCELLED_BY_SYSTEM"), instead of the passenger's hold
 * sitting for Stripe's 7-day auto-cancel.
 *
 * Void-first, then claim. A concurrent manual assign is settled by Stripe:
 * whichever of capture/void lands first makes the other fail — a failed
 * capture runs the assign route's intent reconciliation, and a failed void is
 * reconciled here against the live intent state. Our own successful void also
 * emits payment_intent.canceled; if that webhook cancels the booking before we
 * claim it, the claim count is 0 and we skip the (already-written) audit trail.
 * Transient void errors rethrow so BullMQ retries (the booking is still
 * SEARCHING, so the retry re-enters cleanly).
 */
export async function timeoutSearchingBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  if (booking.status !== BOOKING_STATUSES.SEARCHING) return; // assigned or cancelled meanwhile
  if (!canTransition(booking.status, BOOKING_STATUSES.CANCELLED_BY_SYSTEM)) return;

  const payment = await prisma.payment.findFirst({
    where: { bookingId, status: PAYMENT_STATUSES.REQUIRES_CAPTURE },
  });

  if (payment) {
    try {
      await voidPaymentIntent({
        intentId: payment.stripeIntentId,
        idempotencyKey: `timeout:${bookingId}:void`,
      });
    } catch (err) {
      const intent = await retrievePaymentIntent(payment.stripeIntentId);
      if (intent.status === 'succeeded') {
        // Captured in the race window — a driver was assigned; leave it alone.
        console.warn('[dispatch.timeout] intent captured mid-timeout, skipping', bookingId);
        return;
      }
      if (intent.status !== 'canceled') throw err; // transient — retry via BullMQ
      // Already canceled (e.g. an earlier attempt) — reconcile the booking below.
    }
  }

  const claimed = await prisma.booking.updateMany({
    where: { id: bookingId, status: BOOKING_STATUSES.SEARCHING },
    data: {
      status: BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
      cancellationReason: 'No driver available',
    },
  });
  if (claimed.count === 0) return;

  await prisma.$transaction([
    ...(payment
      ? [
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: PAYMENT_STATUSES.CANCELED },
          }),
        ]
      : []),
    prisma.bookingEvent.create({
      data: {
        bookingId,
        type: 'STATUS_CHANGED',
        payload: {
          from: BOOKING_STATUSES.SEARCHING,
          to: BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
          reason: 'no_driver_timeout',
          timeoutMinutes: noDriverTimeoutMinutes(),
        },
      },
    }),
  ]);

  publishBookingUpdate(bookingId, BOOKING_STATUSES.CANCELLED_BY_SYSTEM);
  publishDispatchEvent({ type: 'dispatch', action: 'removed', bookingId });
}
