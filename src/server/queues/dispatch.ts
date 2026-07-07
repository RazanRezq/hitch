import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

/**
 * BullMQ producer for the `dispatch` queue. A booking that reaches CONFIRMED is
 * enqueued here (from the webhook worker); the worker
 * (src/server/workers/dispatch.worker.ts) advances it to SEARCHING and surfaces
 * it on the dispatcher queue. Dispatch runs here — never inline. See CLAUDE.md
 * "DISPATCH LOGIC".
 *
 * Bookings scheduled for the future are enqueued with a BullMQ delay so they
 * surface at scheduledTime − DISPATCH_LEAD_MINUTES instead of flooding today's
 * queue with tomorrow's pickups. The dispatch service's CONFIRMED guard makes a
 * job that fires after a cancellation (passenger, admin, or Stripe's 7-day
 * auth expiry) a harmless no-op.
 */
export const dispatchQueue = new Queue('dispatch', { connection: redis });

export interface DispatchJobData {
  bookingId: string;
}

/** How far before scheduledTime a booking surfaces on the dispatcher queue. */
const DEFAULT_LEAD_MINUTES = 60;

export function dispatchLeadMinutes(): number {
  const raw = process.env.DISPATCH_LEAD_MINUTES;
  if (!raw) return DEFAULT_LEAD_MINUTES;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LEAD_MINUTES;
}

/**
 * Milliseconds to hold a booking before dispatch: zero for trips already inside
 * the lead window (ASAP airport pickups — the common case), the remainder for
 * future-scheduled trips. Defensive zero on missing/invalid dates.
 */
export function computeDispatchDelayMs(
  scheduledTime: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  if (!scheduledTime) return 0;
  const ts = new Date(scheduledTime).getTime();
  if (Number.isNaN(ts)) return 0;
  const runAt = ts - dispatchLeadMinutes() * 60_000;
  return Math.max(0, runAt - now.getTime());
}

/** Enqueue a booking for dispatch. jobId dedupes to one pending dispatch per booking. */
export function enqueueDispatch(bookingId: string, delayMs = 0) {
  return dispatchQueue.add(
    'offer',
    { bookingId } satisfies DispatchJobData,
    {
      jobId: `dispatch:${bookingId}`,
      delay: delayMs,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}

/** How long a booking may sit in SEARCHING before the auth is voided. */
const DEFAULT_NO_DRIVER_TIMEOUT_MINUTES = 30;

/** 0 (or negative) disables the timeout entirely. */
export function noDriverTimeoutMinutes(): number {
  const raw = process.env.NO_DRIVER_TIMEOUT_MINUTES;
  if (!raw) return DEFAULT_NO_DRIVER_TIMEOUT_MINUTES;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT_NO_DRIVER_TIMEOUT_MINUTES;
}

/**
 * Schedule the no-driver timeout when a booking enters SEARCHING: if no driver
 * has been assigned when it fires, the worker voids the Stripe auth and cancels
 * the booking (CLAUDE.md "No driver in X min → VOID auth → CANCELLED_BY_SYSTEM").
 * Same queue, distinct job name — the worker routes on job.name.
 */
export function enqueueDispatchTimeout(bookingId: string) {
  const minutes = noDriverTimeoutMinutes();
  if (minutes <= 0) return Promise.resolve(null);
  return dispatchQueue.add(
    'timeout',
    { bookingId } satisfies DispatchJobData,
    {
      jobId: `dispatch-timeout:${bookingId}`,
      delay: minutes * 60_000,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}
