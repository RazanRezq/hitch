import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '@/lib/db';
import {
  BOOKING_STATUSES,
  DRIVER_ACTIVE_STATUSES,
  driverAdvanceSchema,
  driverNextStatus,
} from '@/lib/types';
import type { Booking } from '@/lib/types';
import { requireAuth, requireRole, type AuthVariables } from '@/lib/auth/middleware';
import { idempotencyMiddleware } from '@/server/middleware/idempotency';
import { assertTransition, InvalidTransitionError } from '@/server/services/booking/state-machine';
import { publishBookingUpdate } from '@/server/realtime/publish-booking';
import { publishDispatchEvent } from '@/server/realtime/publish-dispatch';

type DriverJobRow = Booking & { passenger: { name: string | null; phone: string | null } };

/**
 * The subset of a booking the driver page needs. Driver-scoped on purpose: the
 * fare (ISK — internal accounting currency) and the passenger's name/phone for
 * the pickup, but no passenger email, no payment internals, no admin DTOs.
 */
function serializeJob(b: DriverJobRow) {
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    scheduledTime: b.scheduledTime,
    pickup: { lat: b.pickupLat, lng: b.pickupLng, address: b.pickupAddress },
    dropoff: { lat: b.dropoffLat, lng: b.dropoffLng, address: b.dropoffAddress },
    pickupAirportCode: b.pickupAirportCode,
    flightNumber: b.flightNumber,
    passengerCount: b.passengerCount,
    vehicleTypeRequested: b.vehicleTypeRequested,
    basePriceISK: b.basePriceISK,
    passenger: { name: b.passenger.name, phone: b.passenger.phone },
    actualPickupAt: b.actualPickupAt,
    actualDropoffAt: b.actualDropoffAt,
  };
}

/**
 * Driver-facing API ("my jobs"). Guarded at the group level by requireAuth +
 * requireRole(DRIVER) — every handler can assume a driver user on c.get('user')
 * and every query scopes to that driver's own rows (ownership lives in the
 * WHERE clause, never trusted from the client). Mounted at /api/driver.
 *
 * Status changes are policy-restricted to the forward path (DRIVER_NEXT_STATUS
 * in lib/types/constants.ts): cancellations and NO_SHOW stay dispatcher-only so
 * a mis-tap in the car can never kill a booking.
 */
export const driverRoute = new Hono<{ Variables: AuthVariables }>()
  .use('*', requireAuth, requireRole(['DRIVER']))

  /** GET /api/driver/me — the signed-in driver's profile, vehicle and shift state. */
  .get('/me', async (c) => {
    const user = c.get('user');
    const [vehicle, location] = await Promise.all([
      prisma.vehicle.findFirst({ where: { driverId: user.id, isActive: true } }),
      prisma.driverLocation.findUnique({ where: { driverId: user.id } }),
    ]);
    return c.json({
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      isOnline: location?.isOnline ?? false,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
            capacity: vehicle.capacity,
          }
        : null,
    });
  })

  /** GET /api/driver/jobs — my in-progress jobs plus today's completed ones. */
  .get('/jobs', async (c) => {
    const user = c.get('user');
    // Iceland is UTC+0 year-round (see APP_TIMEZONE), so the UTC day boundary
    // IS the local day boundary — "today" needs no timezone math.
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const rows = await prisma.booking.findMany({
      where: {
        driverId: user.id,
        OR: [
          { status: { in: [...DRIVER_ACTIVE_STATUSES] } },
          // updatedAt (not actualDropoffAt): also catches jobs completed on the
          // driver's behalf by a dispatcher, which never get a dropoff stamp.
          { status: BOOKING_STATUSES.COMPLETED, updatedAt: { gte: startOfToday } },
        ],
      },
      orderBy: { scheduledTime: 'asc' },
      include: { passenger: { select: { name: true, phone: true } } },
    });

    return c.json({ items: rows.map(serializeJob) });
  })

  /**
   * POST /api/driver/jobs/:id/advance — move my job one step along the forward
   * path (ACCEPTED → DRIVER_ARRIVING → DRIVER_ARRIVED → IN_TRANSIT → COMPLETED).
   * Stamps actualPickupAt / actualDropoffAt on the transitions that mean them.
   */
  .post(
    '/jobs/:id/advance',
    idempotencyMiddleware,
    zValidator('json', driverAdvanceSchema),
    async (c) => {
      const id = c.req.param('id');
      const { to } = c.req.valid('json');
      if (!c.req.header('idempotency-key')) {
        return c.json({ error: 'Idempotency-Key header is required' }, 400);
      }
      const user = c.get('user');

      const booking = await prisma.booking.findUnique({ where: { id } });
      // 404 (not 403) for someone else's booking — don't leak that the id exists.
      if (!booking || booking.driverId !== user.id) {
        return c.json({ error: 'Job not found' }, 404);
      }

      const from = booking.status;
      // Policy first: drivers only move forward along their own path…
      if (driverNextStatus(from) !== to) {
        return c.json({ error: `Cannot move a job from ${from} to ${to}`, code: 'INVALID_STEP' }, 409);
      }
      // …and the state machine stays the final authority (belt and braces).
      try {
        assertTransition(from, to);
      } catch (e) {
        if (e instanceof InvalidTransitionError) return c.json({ error: e.message }, 409);
        throw e;
      }

      const now = new Date();
      // Compare-and-swap on the previous status so a double-tap (or a concurrent
      // dispatcher action) can't apply a transition twice or duplicate the audit
      // event: the second writer matches 0 rows and conflicts out.
      const advanced = await prisma.$transaction(async (tx) => {
        const res = await tx.booking.updateMany({
          where: { id, driverId: user.id, status: from },
          data: {
            status: to,
            ...(to === BOOKING_STATUSES.IN_TRANSIT ? { actualPickupAt: now } : {}),
            ...(to === BOOKING_STATUSES.COMPLETED ? { actualDropoffAt: now } : {}),
          },
        });
        if (res.count === 0) return false;
        await tx.bookingEvent.create({
          data: { bookingId: id, type: 'STATUS_CHANGED', actorId: user.id, payload: { from, to } },
        });
        return true;
      });
      if (!advanced) {
        return c.json(
          { error: 'Job changed while updating — refresh and try again', code: 'CONFLICT' },
          409,
        );
      }

      publishBookingUpdate(id, to);
      if (to === BOOKING_STATUSES.COMPLETED) {
        publishDispatchEvent({ type: 'dispatch', action: 'removed', bookingId: id });
      }

      return c.json({ id, status: to });
    },
  );
