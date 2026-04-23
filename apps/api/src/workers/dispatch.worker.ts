import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';

export const dispatchWorker = new Worker(
  'dispatch',
  async (job) => {
    console.log('[dispatch] processing', job.name, job.id);
  },
  { connection: redis },
);
