import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma, prisma } from '@/lib/db';
import { listQuerySchema } from '@/lib/types';
import type { AuthVariables } from '@/lib/auth/middleware';
import { listEnvelope, paginate, parseSort } from '@/server/lib/list';

export const adminVehiclesRoute = new Hono<{ Variables: AuthVariables }>().get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
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
  },
);
