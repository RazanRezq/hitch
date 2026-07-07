import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BOOKING_STATUSES,
  DRIVER_NEXT_STATUS,
  type BookingStatus,
} from '@/lib/types';
import { canTransition } from '@/server/services/booking/state-machine';

const h = vi.hoisted(() => ({
  user: {
    id: 'driver-1',
    email: 'stefan@hitch.is',
    role: 'DRIVER' as string,
    name: 'Stefán',
  },
  prisma: {
    vehicle: { findFirst: vi.fn() },
    driverLocation: { findUnique: vi.fn() },
    booking: { findUnique: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: {
    booking: { updateMany: vi.fn() },
    bookingEvent: { create: vi.fn() },
  },
  publishBookingUpdate: vi.fn(),
  publishDispatchEvent: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => {
  const requireAuth: import('hono').MiddlewareHandler = async (c, next) => {
    c.set('user', h.user);
    await next();
  };
  const requireRole =
    (allowed: readonly string[]): import('hono').MiddlewareHandler =>
    async (c, next) => {
      if (!allowed.includes(h.user.role)) return c.json({ error: 'Forbidden' }, 403);
      await next();
    };
  return { requireAuth, requireRole };
});
vi.mock('@/lib/db', () => ({ prisma: h.prisma }));
vi.mock('@/server/middleware/idempotency', () => {
  const idempotencyMiddleware: import('hono').MiddlewareHandler = async (_c, next) => {
    await next();
  };
  return { idempotencyMiddleware };
});
vi.mock('@/server/realtime/publish-booking', () => ({
  publishBookingUpdate: h.publishBookingUpdate,
}));
vi.mock('@/server/realtime/publish-dispatch', () => ({
  publishDispatchEvent: h.publishDispatchEvent,
}));

import { driverRoute } from './driver';

function ownedBooking(status: BookingStatus, overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-1',
    code: 'HTCH-1111-2222',
    driverId: 'driver-1',
    status,
    scheduledTime: new Date('2026-07-07T10:00:00Z'),
    pickupLat: 63.985,
    pickupLng: -22.605,
    pickupAddress: 'KEF',
    dropoffLat: 64.1466,
    dropoffLng: -21.9426,
    dropoffAddress: 'Reykjavík 101',
    pickupAirportCode: 'KEF',
    flightNumber: 'FI615',
    passengerCount: 2,
    vehicleTypeRequested: 'SEDAN',
    basePriceISK: 14900,
    actualPickupAt: null,
    actualDropoffAt: null,
    ...overrides,
  };
}

function advanceReq(id: string, to: BookingStatus, headers: Record<string, string> = {}) {
  return driverRoute.request(`/jobs/${id}/advance`, {
    method: 'POST',
    body: JSON.stringify({ to }),
    headers: { 'content-type': 'application/json', 'idempotency-key': 'k-1', ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.user.role = 'DRIVER';
  // Interactive transaction: run the callback against the tx mock.
  h.prisma.$transaction.mockImplementation(async (fn: (tx: typeof h.tx) => Promise<unknown>) =>
    fn(h.tx),
  );
  h.tx.booking.updateMany.mockResolvedValue({ count: 1 });
  h.tx.bookingEvent.create.mockResolvedValue({});
});

describe('driver forward path', () => {
  it('is a strict subset of the state machine', () => {
    for (const [from, to] of Object.entries(DRIVER_NEXT_STATUS)) {
      expect(canTransition(from as BookingStatus, to)).toBe(true);
    }
  });
});

describe('RBAC', () => {
  it('rejects non-driver roles with 403', async () => {
    h.user.role = 'PASSENGER';
    const res = await driverRoute.request('/me');
    expect(res.status).toBe(403);
  });
});

describe('GET /me', () => {
  it('returns profile, active vehicle and shift state', async () => {
    h.prisma.vehicle.findFirst.mockResolvedValue({
      id: 'veh-1',
      make: 'Toyota',
      model: 'Prius',
      licensePlate: 'AB-001',
      vehicleType: 'SEDAN',
      capacity: 4,
    });
    h.prisma.driverLocation.findUnique.mockResolvedValue({ isOnline: true });

    const res = await driverRoute.request('/me');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      id: 'driver-1',
      name: 'Stefán',
      isOnline: true,
      vehicle: { licensePlate: 'AB-001', vehicleType: 'SEDAN' },
    });
    expect(h.prisma.vehicle.findFirst).toHaveBeenCalledWith({
      where: { driverId: 'driver-1', isActive: true },
    });
  });

  it('handles a driver with no vehicle and no location row', async () => {
    h.prisma.vehicle.findFirst.mockResolvedValue(null);
    h.prisma.driverLocation.findUnique.mockResolvedValue(null);

    const body = await (await driverRoute.request('/me')).json();
    expect(body.vehicle).toBeNull();
    expect(body.isOnline).toBe(false);
  });
});

describe('GET /jobs', () => {
  it('scopes the query to the signed-in driver and serializes jobs', async () => {
    h.prisma.booking.findMany.mockResolvedValue([
      { ...ownedBooking(BOOKING_STATUSES.ACCEPTED), passenger: { name: 'Anna', phone: '+3545551234' } },
    ]);

    const res = await driverRoute.request('/jobs');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id: 'bk-1',
      status: BOOKING_STATUSES.ACCEPTED,
      pickup: { address: 'KEF' },
      dropoff: { address: 'Reykjavík 101' },
      basePriceISK: 14900,
      passenger: { name: 'Anna', phone: '+3545551234' },
    });
    // No payment internals, no passenger email in the driver-scoped shape.
    expect(body.items[0]).not.toHaveProperty('displayPrice');
    expect(body.items[0].passenger).not.toHaveProperty('email');

    const where = h.prisma.booking.findMany.mock.calls[0][0].where;
    expect(where.driverId).toBe('driver-1');
  });
});

describe('POST /jobs/:id/advance', () => {
  it('requires an Idempotency-Key header', async () => {
    const res = await driverRoute.request('/jobs/bk-1/advance', {
      method: 'POST',
      body: JSON.stringify({ to: BOOKING_STATUSES.DRIVER_ARRIVING }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it("404s for another driver's booking without leaking its existence", async () => {
    h.prisma.booking.findUnique.mockResolvedValue(
      ownedBooking(BOOKING_STATUSES.ACCEPTED, { driverId: 'driver-2' }),
    );
    const res = await advanceReq('bk-1', BOOKING_STATUSES.DRIVER_ARRIVING);
    expect(res.status).toBe(404);
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('advances one step along the forward path and writes the audit event', async () => {
    h.prisma.booking.findUnique.mockResolvedValue(ownedBooking(BOOKING_STATUSES.ACCEPTED));

    const res = await advanceReq('bk-1', BOOKING_STATUSES.DRIVER_ARRIVING);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 'bk-1', status: BOOKING_STATUSES.DRIVER_ARRIVING });

    const update = h.tx.booking.updateMany.mock.calls[0][0];
    // Compare-and-swap on the previous status, scoped to the owner.
    expect(update.where).toEqual({
      id: 'bk-1',
      driverId: 'driver-1',
      status: BOOKING_STATUSES.ACCEPTED,
    });
    expect(update.data.status).toBe(BOOKING_STATUSES.DRIVER_ARRIVING);
    expect(update.data.actualPickupAt).toBeUndefined();

    expect(h.tx.bookingEvent.create).toHaveBeenCalledWith({
      data: {
        bookingId: 'bk-1',
        type: 'STATUS_CHANGED',
        actorId: 'driver-1',
        payload: { from: BOOKING_STATUSES.ACCEPTED, to: BOOKING_STATUSES.DRIVER_ARRIVING },
      },
    });
    expect(h.publishBookingUpdate).toHaveBeenCalledWith('bk-1', BOOKING_STATUSES.DRIVER_ARRIVING);
    expect(h.publishDispatchEvent).not.toHaveBeenCalled();
  });

  it('rejects skipping steps with 409 INVALID_STEP', async () => {
    h.prisma.booking.findUnique.mockResolvedValue(ownedBooking(BOOKING_STATUSES.ACCEPTED));
    const res = await advanceReq('bk-1', BOOKING_STATUSES.COMPLETED);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('INVALID_STEP');
    expect(h.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects driver-forbidden targets (cancellations) at the schema boundary', async () => {
    h.prisma.booking.findUnique.mockResolvedValue(ownedBooking(BOOKING_STATUSES.ACCEPTED));
    const res = await advanceReq('bk-1', BOOKING_STATUSES.CANCELLED_BY_DRIVER);
    expect(res.status).toBe(400); // zod enum only allows the forward path
  });

  it('has no forward step out of a terminal status', async () => {
    h.prisma.booking.findUnique.mockResolvedValue(ownedBooking(BOOKING_STATUSES.COMPLETED));
    const res = await advanceReq('bk-1', BOOKING_STATUSES.COMPLETED);
    expect(res.status).toBe(409);
  });

  it('stamps actualPickupAt when the trip starts', async () => {
    h.prisma.booking.findUnique.mockResolvedValue(ownedBooking(BOOKING_STATUSES.DRIVER_ARRIVED));
    await advanceReq('bk-1', BOOKING_STATUSES.IN_TRANSIT);
    const update = h.tx.booking.updateMany.mock.calls[0][0];
    expect(update.data.actualPickupAt).toBeInstanceOf(Date);
    expect(update.data.actualDropoffAt).toBeUndefined();
  });

  it('stamps actualDropoffAt on completion and tells the dispatch board', async () => {
    h.prisma.booking.findUnique.mockResolvedValue(ownedBooking(BOOKING_STATUSES.IN_TRANSIT));
    const res = await advanceReq('bk-1', BOOKING_STATUSES.COMPLETED);
    expect(res.status).toBe(200);
    const update = h.tx.booking.updateMany.mock.calls[0][0];
    expect(update.data.actualDropoffAt).toBeInstanceOf(Date);
    expect(h.publishDispatchEvent).toHaveBeenCalledWith({
      type: 'dispatch',
      action: 'removed',
      bookingId: 'bk-1',
    });
  });

  it('409s (and writes nothing) when the job changed concurrently', async () => {
    h.prisma.booking.findUnique.mockResolvedValue(ownedBooking(BOOKING_STATUSES.ACCEPTED));
    h.tx.booking.updateMany.mockResolvedValue({ count: 0 });

    const res = await advanceReq('bk-1', BOOKING_STATUSES.DRIVER_ARRIVING);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('CONFLICT');
    expect(h.tx.bookingEvent.create).not.toHaveBeenCalled();
    expect(h.publishBookingUpdate).not.toHaveBeenCalled();
  });
});
