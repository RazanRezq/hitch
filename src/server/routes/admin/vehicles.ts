import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma, prisma } from '@/lib/db';
import { createVehicleSchema, listQuerySchema, updateVehicleSchema } from '@/lib/types';
import type { AuthVariables } from '@/lib/auth/middleware';
import { idempotencyMiddleware } from '@/server/middleware/idempotency';
import { listEnvelope, paginate, parseSort } from '@/server/lib/list';

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export const adminVehiclesRoute = new Hono<{ Variables: AuthVariables }>()
  /** GET /api/admin/vehicles — list with driver. */
  .get('/', zValidator('query', listQuerySchema), async (c) => {
    const { page, pageSize, q, sort } = c.req.valid('query');
    const { skip, take } = paginate(page, pageSize);
    const { field, dir } = parseSort(sort, ['createdAt', 'licensePlate', 'vehicleType'], {
      field: 'createdAt',
      dir: 'desc',
    });

    const where: Prisma.VehicleWhereInput = q
      ? {
          OR: [
            { licensePlate: { contains: q, mode: 'insensitive' } },
            { make: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const orderBy: Prisma.VehicleOrderByWithRelationInput =
      field === 'licensePlate'
        ? { licensePlate: dir }
        : field === 'vehicleType'
          ? { vehicleType: dir }
          : { createdAt: dir };

    const [rows, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy,
        skip,
        take,
        include: { driver: { select: { id: true, name: true } } },
      }),
      prisma.vehicle.count({ where }),
    ]);

    const items = rows.map((v) => ({
      id: v.id,
      licensePlate: v.licensePlate,
      make: v.make,
      model: v.model,
      year: v.year,
      color: v.color,
      vehicleType: v.vehicleType,
      capacity: v.capacity,
      isActive: v.isActive,
      driver: { id: v.driver.id, name: v.driver.name },
    }));

    return c.json(listEnvelope(items, total, page, pageSize));
  })

  /** POST /api/admin/vehicles — create (driver must exist + be a DRIVER). */
  .post('/', idempotencyMiddleware, zValidator('json', createVehicleSchema), async (c) => {
    const body = c.req.valid('json');
    const driver = await prisma.user.findUnique({ where: { id: body.driverId } });
    if (!driver || driver.role !== 'DRIVER') return c.json({ error: 'Driver not found' }, 404);

    try {
      const v = await prisma.vehicle.create({ data: { ...body, isActive: body.isActive ?? true } });
      return c.json({ id: v.id }, 201);
    } catch (e) {
      if (isUniqueViolation(e)) return c.json({ error: 'License plate already exists' }, 409);
      throw e;
    }
  })

  /** PATCH /api/admin/vehicles/:id — update (incl. isActive). */
  .patch('/:id', zValidator('json', updateVehicleSchema), async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) return c.json({ error: 'Vehicle not found' }, 404);

    if (body.driverId) {
      const driver = await prisma.user.findUnique({ where: { id: body.driverId } });
      if (!driver || driver.role !== 'DRIVER') return c.json({ error: 'Driver not found' }, 404);
    }

    try {
      const v = await prisma.vehicle.update({ where: { id }, data: body });
      return c.json({ id: v.id });
    } catch (e) {
      if (isUniqueViolation(e)) return c.json({ error: 'License plate already exists' }, 409);
      throw e;
    }
  })

  /** DELETE /api/admin/vehicles/:id — only when not referenced by bookings. */
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) return c.json({ error: 'Vehicle not found' }, 404);

    const refs = await prisma.booking.count({ where: { vehicleId: id } });
    if (refs > 0) {
      return c.json(
        { error: 'Vehicle is referenced by bookings — deactivate it instead' },
        409,
      );
    }

    await prisma.vehicle.delete({ where: { id } });
    return c.json({ ok: true });
  });
