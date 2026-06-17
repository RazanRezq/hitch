import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

/**
 * BullMQ producer for the `dispatch` queue. A booking that reaches CONFIRMED is
 * enqueued here (from the webhook worker); the worker
 * (src/server/workers/dispatch.worker.ts) advances it to SEARCHING and surfaces
 * it on the dispatcher queue. Dispatch runs here — never inline. See CLAUDE.md
 * "DISPATCH LOGIC".
 */
export const dispatchQueue = new Queue('dispatch', { connection: redis });

export interface DispatchJobData {
  bookingId: string;
}

/** Enqueue a booking for dispatch. jobId dedupes to one pending dispatch per booking. */
export function enqueueDispatch(bookingId: string) {
  return dispatchQueue.add(
    'offer',
    { bookingId } satisfies DispatchJobData,
    {
      jobId: `dispatch:${bookingId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );
}
