import { Hono } from 'hono';
import { prisma } from '@hitch/db';

export const exchangeRatesRoute = new Hono().get('/', async (c) => {
  const [eur, usd] = await Promise.all([
    prisma.exchangeRate.findFirst({
      where: { toCurrency: 'EUR' },
      orderBy: { fetchedAt: 'desc' },
    }),
    prisma.exchangeRate.findFirst({
      where: { toCurrency: 'USD' },
      orderBy: { fetchedAt: 'desc' },
    }),
  ]);

  return c.json({
    base: 'ISK',
    rates: {
      ISK: 1,
      EUR: eur?.rate ?? null,
      USD: usd?.rate ?? null,
    },
    fetchedAt: eur?.fetchedAt ?? new Date().toISOString(),
  });
});
