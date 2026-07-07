import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { dispatchBooking, timeoutSearchingBooking } from '../services/dispatch';
import type { DispatchJobData } from '../queues/dispatch';

/**
 * Consumes the `dispatch` queue. Delegates to the dispatch service (which holds
 * the matching/transition logic) so dispatch never runs inline. Failures rethrow
 * so BullMQ retries with backoff. Routes on job.name: 'offer' surfaces a
 * CONFIRMED booking; 'timeout' voids + cancels one still SEARCHING.
 */
export const dispatchWorker = new Worker(
  'dispatch',
  async (job) => {
    const { bookingId } = job.data as DispatchJobData;
    if (job.name === 'timeout') {
      await timeoutSearchingBooking(bookingId);
      return;
    }
    await dispatchBooking(bookingId);
  },
  { connection: redis },
);
