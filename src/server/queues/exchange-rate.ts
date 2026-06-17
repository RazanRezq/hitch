import { Queue } from 'bullmq';
import { redis } from '../lib/redis';

/**
 * BullMQ producer + scheduler for the `exchange-rate` queue. The worker
 * (src/server/workers/exchange-rate.worker.ts) fetches ISK→EUR/USD and writes
 * ExchangeRate rows. See CLAUDE.md "Exchange Rate Worker".
 */
export const exchangeRateQueue = new Queue('exchange-rate', { connection: redis });

const SCHEDULER_ID = 'exchange-rate-daily';

/**
 * Idempotently register the daily rate fetch at 06:00 UTC. Safe to call on
 * every worker boot — upsertJobScheduler reconciles to a single schedule.
 */
export async function registerExchangeRateSchedule() {
  await exchangeRateQueue.upsertJobScheduler(
    SCHEDULER_ID,
    { pattern: '0 6 * * *', tz: 'UTC' },
    { name: 'fetch', data: {} },
  );
}
