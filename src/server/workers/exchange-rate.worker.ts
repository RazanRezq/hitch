import { Worker } from 'bullmq';
import { prisma } from '../../lib/db';
import { CURRENCIES, type Currency } from '../../lib/types';
import { redis } from '../lib/redis.js';
import { getRatesProvider } from '../services/currency/provider';

/** Display currencies we keep an ISK rate for (everything except ISK itself). */
const TARGETS: Currency[] = CURRENCIES.filter((c) => c !== 'ISK');

/**
 * Fetches the latest ISK→EUR/USD rates from the configured provider and appends
 * a fresh ExchangeRate row per currency (history is preserved; getLatestRate
 * reads the newest). Scheduled daily at 06:00 UTC via the exchange-rate queue
 * scheduler — see src/server/queues/exchange-rate.ts. Failures rethrow so
 * BullMQ retries with backoff. See CLAUDE.md "Exchange Rate Worker".
 */
export const exchangeRateWorker = new Worker(
  'exchange-rate',
  async (job) => {
    const provider = getRatesProvider();
    const rates = await provider.fetchRates(TARGETS);
    const fetchedAt = new Date();

    const stored: string[] = [];
    for (const target of TARGETS) {
      const rate = rates[target];
      if (typeof rate !== 'number' || rate <= 0) {
        console.warn('[exchange-rate] no rate returned for', target);
        continue;
      }
      await prisma.exchangeRate.create({
        data: { fromCurrency: 'ISK', toCurrency: target, rate, fetchedAt },
      });
      stored.push(`ISK→${target}=${rate}`);
    }

    if (stored.length === 0) {
      throw new Error('exchange-rate: provider returned no usable rates');
    }
    console.log('[exchange-rate] stored', stored.join(' '), '(job', job.id, ')');
  },
  { connection: redis },
);
