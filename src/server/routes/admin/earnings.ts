import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '@/lib/db';
import { BOOKING_STATUSES, adminEarningsQuerySchema } from '@/lib/types';
import type { AuthVariables } from '@/lib/auth/middleware';
import { aggregateEarnings } from '@/server/services/payouts/earnings';

/** Start of the current UTC month (Iceland is UTC+0 year-round). */
function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * GET /api/admin/earnings — interim per-driver earnings for manual payouts.
 * Window defaults to month-to-date; see services/payouts/earnings.ts for the
 * basis (COMPLETED by scheduledTime, gross captured amountISK, refunds
 * excluded). Small fleet — no pagination; the whole window is aggregated.
 */
export const adminEarningsRoute = new Hono<{ Variables: AuthVariables }>().get(
  '/',
  zValidator('query', adminEarningsQuerySchema),
  async (c) => {
    const q = c.req.valid('query');
    const now = new Date();
    const from = q.from ? new Date(q.from) : startOfUtcMonth(now);
    const to = q.to ? new Date(q.to) : now;
    if (from.getTime() > to.getTime()) {
      return c.json({ error: '`from` must not be after `to`' }, 400);
    }

    const bookings = await prisma.booking.findMany({
      where: {
        status: BOOKING_STATUSES.COMPLETED,
        scheduledTime: { gte: from, lte: to },
      },
      orderBy: { scheduledTime: 'asc' },
      include: {
        driver: { select: { id: true, name: true, email: true } },
        payments: {
          select: { status: true, amountISK: true, createdAt: true },
        },
      },
    });

    return c.json({
      from: from.toISOString(),
      to: to.toISOString(),
      ...aggregateEarnings(bookings),
    });
  },
);
