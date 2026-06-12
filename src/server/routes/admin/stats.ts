import { Hono } from 'hono';
import { prisma } from '@/lib/db';
import {
  ACTIVE_BOOKING_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
} from '@/lib/types';
import type { AuthVariables } from '@/lib/auth/middleware';

/** Start of the current UTC day (Iceland is UTC+0 year-round — see APP_TIMEZONE). */
function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const adminStatsRoute = new Hono<{ Variables: AuthVariables }>().get(
  '/overview',
  async (c) => {
    const now = new Date();
    const startToday = startOfUtcDay(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      bookingsToday,
      activeTrips,
      onlineDrivers,
      completedToday,
      revenueTodayAgg,
      revenue7dAgg,
      terminal7d,
      completed7d,
    ] = await Promise.all([
      prisma.booking.count({ where: { createdAt: { gte: startToday } } }),
      prisma.booking.count({ where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } } }),
      prisma.driverLocation.count({ where: { isOnline: true } }),
      prisma.booking.count({
        where: { status: BOOKING_STATUSES.COMPLETED, updatedAt: { gte: startToday } },
      }),
      prisma.payment.aggregate({
        _sum: { amountISK: true },
        where: { status: PAYMENT_STATUSES.SUCCEEDED, capturedAt: { gte: startToday } },
      }),
      prisma.payment.aggregate({
        _sum: { amountISK: true },
        where: { status: PAYMENT_STATUSES.SUCCEEDED, capturedAt: { gte: sevenDaysAgo } },
      }),
      prisma.booking.count({
        where: { createdAt: { gte: sevenDaysAgo }, status: { in: [...TERMINAL_BOOKING_STATUSES] } },
      }),
      prisma.booking.count({
        where: { createdAt: { gte: sevenDaysAgo }, status: BOOKING_STATUSES.COMPLETED },
      }),
    ]);

    return c.json({
      bookingsToday,
      activeTrips,
      onlineDrivers,
      completedToday,
      revenueISKToday: revenueTodayAgg._sum.amountISK ?? 0,
      revenueISK7d: revenue7dAgg._sum.amountISK ?? 0,
      completionRate7d: terminal7d > 0 ? completed7d / terminal7d : null,
    });
  },
);
