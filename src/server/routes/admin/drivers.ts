import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@/lib/db';
import { prisma } from '@/lib/db';
import {
  ACTIVE_BOOKING_STATUSES,
  adminDriverListQuerySchema,
  createDriverSchema,
  updateDriverSchema,
  setDriverOnlineSchema,
} from '@/lib/types';
import type { AuthVariables } from '@/lib/auth/middleware';
import { idempotencyMiddleware } from '@/server/middleware/idempotency';
import { listEnvelope, paginate, parseSort } from '@/server/lib/list';
import { getDownloadUrl } from '@/server/services/storage';

// Reykjavík centre — fallback location for a driver brought online before any GPS fix.
const DEFAULT_LAT = 64.1466;
const DEFAULT_LNG = -21.9426;

/** Driver documents are private: resolve a key to a short-TTL signed URL. */
async function resolveDocUrl(fileUrl: string): Promise<string> {
  if (/^https?:\/\//.test(fileUrl)) return fileUrl; // already a full (public) URL
  return getDownloadUrl(fileUrl);
}

export const adminDriversRoute = new Hono<{ Variables: AuthVariables }>()
  /** GET /api/admin/drivers — list drivers with online status, vehicle, rating, active trips. */
  .get('/', zValidator('query', adminDriverListQuerySchema), async (c) => {
    const { page, pageSize, q, sort, online } = c.req.valid('query');
    const { skip, take } = paginate(page, pageSize);
    const { field, dir } = parseSort(sort, ['createdAt', 'name'], { field: 'createdAt', dir: 'desc' });

    const where: Prisma.UserWhereInput = {
      role: 'DRIVER',
      ...(online !== undefined ? { driverLocation: { is: { isOnline: online } } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [drivers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: field === 'name' ? { name: dir } : { createdAt: dir },
        skip,
        take,
        include: { driverLocation: true, vehiclesAsDriver: { where: { isActive: true }, take: 1 } },
      }),
      prisma.user.count({ where }),
    ]);

    const ids = drivers.map((d) => d.id);
    const [ratings, activeTrips] = await Promise.all([
      prisma.rating.groupBy({
        by: ['rateeId'],
        where: { rateeId: { in: ids } },
        _avg: { score: true },
        _count: { _all: true },
      }),
      prisma.booking.groupBy({
        by: ['driverId'],
        where: { driverId: { in: ids }, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
        _count: { _all: true },
      }),
    ]);
    const ratingByDriver = new Map(
      ratings.map((r) => [r.rateeId, { avg: r._avg.score, count: r._count._all }]),
    );
    const activeByDriver = new Map(activeTrips.map((a) => [a.driverId, a._count._all]));

    const items = drivers.map((d) => {
      const v = d.vehiclesAsDriver[0];
      return {
        id: d.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        avatarUrl: d.avatarUrl,
        createdAt: d.createdAt,
        isOnline: d.driverLocation?.isOnline ?? false,
        location: d.driverLocation
          ? {
              lat: d.driverLocation.lat,
              lng: d.driverLocation.lng,
              heading: d.driverLocation.heading,
              updatedAt: d.driverLocation.updatedAt,
            }
          : null,
        vehicle: v
          ? { id: v.id, make: v.make, model: v.model, licensePlate: v.licensePlate, vehicleType: v.vehicleType }
          : null,
        rating: ratingByDriver.get(d.id) ?? { avg: null, count: 0 },
        activeTrips: activeByDriver.get(d.id) ?? 0,
      };
    });

    return c.json(listEnvelope(items, total, page, pageSize));
  })

  /** GET /api/admin/drivers/:id — full profile, vehicles, documents (signed URLs), recent trips. */
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const driver = await prisma.user.findUnique({
      where: { id },
      include: {
        driverLocation: true,
        vehiclesAsDriver: true,
        driverDocuments: { orderBy: { createdAt: 'desc' } },
        ratingsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { rater: { select: { id: true, name: true } } },
        },
        bookingsAsDriver: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            scheduledTime: true,
            pickupAddress: true,
            dropoffAddress: true,
            basePriceISK: true,
            displayCurrency: true,
            displayPrice: true,
          },
        },
      },
    });
    if (!driver || driver.role !== 'DRIVER') return c.json({ error: 'Driver not found' }, 404);

    const documents = await Promise.all(
      driver.driverDocuments.map(async (doc) => ({
        id: doc.id,
        type: doc.type,
        expiresAt: doc.expiresAt,
        verifiedAt: doc.verifiedAt,
        verifiedById: doc.verifiedById,
        createdAt: doc.createdAt,
        signedUrl: await resolveDocUrl(doc.fileUrl),
      })),
    );

    const ratingAgg = await prisma.rating.aggregate({
      where: { rateeId: id },
      _avg: { score: true },
      _count: { _all: true },
    });

    return c.json({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      avatarUrl: driver.avatarUrl,
      createdAt: driver.createdAt,
      isOnline: driver.driverLocation?.isOnline ?? false,
      location: driver.driverLocation
        ? {
            lat: driver.driverLocation.lat,
            lng: driver.driverLocation.lng,
            heading: driver.driverLocation.heading,
            updatedAt: driver.driverLocation.updatedAt,
          }
        : null,
      vehicles: driver.vehiclesAsDriver.map((v) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        licensePlate: v.licensePlate,
        vehicleType: v.vehicleType,
        capacity: v.capacity,
        isActive: v.isActive,
        photos: v.photos,
      })),
      documents,
      ratings: driver.ratingsReceived.map((r) => ({
        id: r.id,
        score: r.score,
        comment: r.comment,
        createdAt: r.createdAt,
        rater: r.rater,
      })),
      rating: { avg: ratingAgg._avg.score, count: ratingAgg._count._all },
      recentBookings: driver.bookingsAsDriver,
    });
  })

  /** POST /api/admin/drivers — create a driver user (no auth credentials yet; driver app is Phase 2). */
  .post('/', idempotencyMiddleware, zValidator('json', createDriverSchema), async (c) => {
    const body = c.req.valid('json');
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return c.json({ error: 'A user with this email already exists' }, 409);

    const driver = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        phone: body.phone,
        avatarUrl: body.avatarUrl,
        role: 'DRIVER',
      },
    });
    return c.json(
      { id: driver.id, name: driver.name, email: driver.email, phone: driver.phone, role: driver.role },
      201,
    );
  })

  /** PATCH /api/admin/drivers/:id — update driver profile. */
  .patch('/:id', zValidator('json', updateDriverSchema), async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'DRIVER') return c.json({ error: 'Driver not found' }, 404);

    const driver = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
    });
    return c.json({ id: driver.id, name: driver.name, email: driver.email, phone: driver.phone });
  })

  /** POST /api/admin/drivers/:id/online — toggle online (upserts DriverLocation). */
  .post('/:id/online', zValidator('json', setDriverOnlineSchema), async (c) => {
    const id = c.req.param('id');
    const { isOnline } = c.req.valid('json');
    const driver = await prisma.user.findUnique({ where: { id } });
    if (!driver || driver.role !== 'DRIVER') return c.json({ error: 'Driver not found' }, 404);

    const loc = await prisma.driverLocation.upsert({
      where: { driverId: id },
      update: { isOnline },
      create: { driverId: id, isOnline, lat: DEFAULT_LAT, lng: DEFAULT_LNG },
    });
    return c.json({ driverId: id, isOnline: loc.isOnline });
  })

  /** POST /api/admin/drivers/:id/documents/:docId/verify — mark a document verified. */
  .post('/:id/documents/:docId/verify', async (c) => {
    const id = c.req.param('id');
    const docId = c.req.param('docId');
    const actor = c.get('user');

    const doc = await prisma.driverDocument.findUnique({ where: { id: docId } });
    if (!doc || doc.driverId !== id) return c.json({ error: 'Document not found' }, 404);

    const updated = await prisma.driverDocument.update({
      where: { id: docId },
      data: { verifiedAt: new Date(), verifiedById: actor.id },
    });
    return c.json({ id: updated.id, verifiedAt: updated.verifiedAt, verifiedById: updated.verifiedById });
  });
