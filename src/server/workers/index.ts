/**
 * Single entry that boots every BullMQ worker in one process. Run via
 * `npm run workers`. Each worker import has the side effect of starting its
 * BullMQ listener; we just need them resident.
 */
import { initSentry, Sentry } from '../lib/sentry.js';
initSentry('workers'); // before the workers can start failing

import { dispatchWorker } from './dispatch.worker.js';
import { webhookWorker } from './webhook.worker.js';
import { exchangeRateWorker } from './exchange-rate.worker.js';
import { payoutWorker } from './payout.worker.js';
import { registerExchangeRateSchedule } from '../queues/exchange-rate.js';

const workers = [
  { name: 'dispatch', worker: dispatchWorker },
  { name: 'webhooks', worker: webhookWorker },
  { name: 'exchange-rate', worker: exchangeRateWorker },
  { name: 'payouts', worker: payoutWorker },
];

// BullMQ swallows processor errors into retries — without this hook a job that
// exhausts its attempts dies silently (the exact failure mode the readiness
// audit flagged for webhooks/dispatch).
for (const { name, worker } of workers) {
  worker.on('failed', (job, err) => {
    Sentry.captureException(err, {
      extra: {
        queue: name,
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade: job?.attemptsMade,
        data: job?.data,
      },
    });
  });
}

console.log('[workers] booted:', workers.map((w) => w.name).join(', '));

// Register repeatable schedules (idempotent). The daily 06:00 UTC rate fetch
// lives here so it's installed whenever the workers process starts.
void registerExchangeRateSchedule()
  .then(() => console.log('[workers] exchange-rate schedule registered (daily 06:00 UTC)'))
  .catch((err) => console.error('[workers] failed to register exchange-rate schedule', err));

async function shutdown(signal: string) {
  console.log(`[workers] received ${signal}, closing...`);
  await Promise.all(workers.map((w) => w.worker.close()));
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
