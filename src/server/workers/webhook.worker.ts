import { Worker } from 'bullmq';
import type Stripe from 'stripe';
import { prisma } from '../../lib/db';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '../../lib/types';
import { redis } from '../lib/redis.js';

/**
 * Consumes the `webhooks` queue. Each job points at a WebhookEvent row that
 * the Stripe webhook route already wrote to the outbox. We re-load it, switch
 * on event.type, and apply the booking state transition inside a single
 * transaction. Failures rethrow so BullMQ retries with exponential backoff.
 */
export const webhookWorker = new Worker(
  'webhooks',
  async (job) => {
    const { webhookEventId } = job.data as { webhookEventId: string };

    const record = await prisma.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });
    if (!record) throw new Error(`WebhookEvent ${webhookEventId} not found`);
    if (record.status === 'processed') return; // already done

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    try {
      const event = record.payload as unknown as Stripe.Event;
      switch (event.type) {
        case 'payment_intent.amount_capturable_updated':
          await handleAuthorized(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.canceled':
          await handleCanceled(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          // Unhandled types are recorded but not fatal — mark processed.
          break;
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'processed', processedAt: new Date(), lastError: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'failed', lastError: message },
      });
      throw err;
    }
  },
  { connection: redis },
);

/**
 * Manual-capture intent transitioned to requires_capture — the customer
 * authorized payment. Flip booking PENDING_PAYMENT → CONFIRMED, write the
 * audit trail. Idempotent: silently no-ops if the booking already advanced.
 */
async function handleAuthorized(intent: Stripe.PaymentIntent) {
  const payment = await prisma.payment.findUnique({
    where: { stripeIntentId: intent.id },
  });
  if (!payment) {
    console.warn('[webhook] handleAuthorized: no payment for intent', intent.id);
    return;
  }
  const booking = await prisma.booking.findUnique({
    where: { id: payment.bookingId },
  });
  if (!booking) return;
  if (booking.status !== BOOKING_STATUSES.PENDING_PAYMENT) return;

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: BOOKING_STATUSES.CONFIRMED },
    }),
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: PAYMENT_STATUSES.REQUIRES_CAPTURE },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: 'PAYMENT_AUTHORIZED',
        payload: {
          stripeIntentId: intent.id,
          amount: intent.amount,
          currency: intent.currency,
        },
      },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: 'STATUS_CHANGED',
        payload: {
          from: BOOKING_STATUSES.PENDING_PAYMENT,
          to: BOOKING_STATUSES.CONFIRMED,
        },
      },
    }),
  ]);
}

/**
 * PaymentIntent canceled (either by us or by Stripe timeout). Flip the
 * booking to CANCELLED_BY_SYSTEM only if it was still pending payment —
 * otherwise the passenger-initiated cancel path already handled it.
 */
async function handleCanceled(intent: Stripe.PaymentIntent) {
  const payment = await prisma.payment.findUnique({
    where: { stripeIntentId: intent.id },
  });
  if (!payment) return;
  const booking = await prisma.booking.findUnique({
    where: { id: payment.bookingId },
  });
  if (!booking) return;
  if (booking.status !== BOOKING_STATUSES.PENDING_PAYMENT) return;

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: BOOKING_STATUSES.CANCELLED_BY_SYSTEM },
    }),
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: PAYMENT_STATUSES.CANCELED },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        type: 'STATUS_CHANGED',
        payload: {
          from: booking.status,
          to: BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
          reason: 'stripe_canceled',
        },
      },
    }),
  ]);
}

/**
 * PaymentIntent failed. We don't flip the booking yet — the client will
 * retry payment from the same intent. Just leave a note for ops/audit.
 */
async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const payment = await prisma.payment.findUnique({
    where: { stripeIntentId: intent.id },
  });
  if (!payment) return;
  await prisma.bookingEvent.create({
    data: {
      bookingId: payment.bookingId,
      type: 'NOTE_ADDED',
      payload: {
        kind: 'payment_failed',
        stripeIntentId: intent.id,
        lastPaymentError: intent.last_payment_error?.message ?? null,
      },
    },
  });
}
