import { prisma } from '@/lib/db';
import type { Currency } from '@/lib/types';

export async function getLatestRate(to: Currency): Promise<number> {
  if (to === 'ISK') return 1;
  const latest = await prisma.exchangeRate.findFirst({
    where: { toCurrency: to },
    orderBy: { fetchedAt: 'desc' },
  });
  return latest?.rate ?? 0;
}

export async function convertFromISK(amountISK: number, to: Currency): Promise<number> {
  if (to === 'ISK') return amountISK;
  const rate = await getLatestRate(to);
  return Math.round(amountISK * rate * 100) / 100;
}
