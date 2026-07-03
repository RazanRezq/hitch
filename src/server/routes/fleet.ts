import { Hono } from 'hono';
import { prisma } from '@/lib/db';

/**
 * GET /api/fleet — public, no auth. Powers the landing header's live
 * "N cars on shift" strip.
 *
 * Returns ONLY an aggregate count (no driver ids, no locations, no PII), so it's
 * safe to expose to anonymous visitors. "On shift" == DriverLocation.isOnline,
 * the same signal the admin overview counts, so the public number stays
 * consistent with the dashboard.
 */
export const fleetRoute = new Hono().get('/', async (c) => {
  const onlineDrivers = await prisma.driverLocation.count({
    where: { isOnline: true },
  });
  return c.json({ onlineDrivers });
});
