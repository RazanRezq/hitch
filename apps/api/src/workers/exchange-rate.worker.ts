import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';

/** Cron target — scheduled daily at 06:00 UTC. See CLAUDE.md "Exchange Rate Worker". */
export const exchangeRateWorker = new Worker(
  'exchange-rate',
  async (job) => {
    console.log('[exchange-rate] fetching', job.name, job.id);
  },
  { connection: redis },
);
