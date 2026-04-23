import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';

export const payoutWorker = new Worker(
  'payouts',
  async (job) => {
    console.log('[payout] processing', job.name, job.id);
  },
  { connection: redis },
);
