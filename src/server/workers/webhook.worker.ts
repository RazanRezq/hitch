import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';

export const webhookWorker = new Worker(
  'webhooks',
  async (job) => {
    console.log('[webhook] processing', job.name, job.id);
  },
  { connection: redis },
);
