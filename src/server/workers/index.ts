/**
 * Single entry that boots every BullMQ worker in one process. Run via
 * `npm run workers`. Each worker import has the side effect of starting its
 * BullMQ listener; we just need them resident.
 */
import { dispatchWorker } from './dispatch.worker.js';
import { webhookWorker } from './webhook.worker.js';
import { exchangeRateWorker } from './exchange-rate.worker.js';
import { payoutWorker } from './payout.worker.js';

const workers = [
  { name: 'dispatch', worker: dispatchWorker },
  { name: 'webhooks', worker: webhookWorker },
  { name: 'exchange-rate', worker: exchangeRateWorker },
  { name: 'payouts', worker: payoutWorker },
];

console.log('[workers] booted:', workers.map((w) => w.name).join(', '));

async function shutdown(signal: string) {
  console.log(`[workers] received ${signal}, closing...`);
  await Promise.all(workers.map((w) => w.worker.close()));
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
