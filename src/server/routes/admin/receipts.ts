import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@/lib/db';
import { prisma } from '@/lib/db';
import {
  PAYMENT_STATUSES,
  RECEIPT_SOURCES,
  adminReceiptListQuerySchema,
  issueReceiptSchema,
} from '@/lib/types';
import type { AuthVariables } from '@/lib/auth/middleware';
import { idempotencyMiddleware } from '@/server/middleware/idempotency';
import { listEnvelope, paginate, parseSort } from '@/server/lib/list';
import { serializeReceiptDetail, serializeReceiptListItem } from '@/server/lib/receipt-serialize';

const LIST_SORT_FIELDS = ['createdAt', 'number'] as const;

/**
 * Admin receipts API. Mounted under /api/admin (requireAuth + requireRole
 * SUPER_ADMIN|DISPATCHER), so every handler assumes a staff user on
 * c.get('user'). A receipt is an immutable snapshot — issued once, never edited
 * — so this route only lists, reads, and issues. These are RECEIPTS (kvittanir),
 * not legal invoices; the sequential number is display-only.
 */
export const adminReceiptsRoute = new Hono<{ Variables: AuthVariables }>()
  /** GET /api/admin/receipts — the receipts book (filtered, paginated). */
  .get('/', zValidator('query', adminReceiptListQuerySchema), async (c) => {
    const { page, pageSize, q, sort, source } = c.req.valid('query');
    const { skip, take } = paginate(page, pageSize);
    const { field, dir } = parseSort(sort, LIST_SORT_FIELDS, { field: 'createdAt', dir: 'desc' });

    // q matches free-text fields, and the numeric part of an R00042-style number.
    const numeric = q ? Number.parseInt(q.replace(/^R/i, ''), 10) : NaN;
    const where: Prisma.ReceiptWhereInput = {
      ...(source ? { source } : {}),
      ...(q
        ? {
            OR: [
              { pickupAddress: { contains: q, mode: 'insensitive' } },
              { dropoffAddress: { contains: q, mode: 'insensitive' } },
              { driverName: { contains: q, mode: 'insensitive' } },
              { vehiclePlate: { contains: q, mode: 'insensitive' } },
              ...(Number.isNaN(numeric) ? [] : [{ number: numeric }]),
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.receipt.findMany({
        where,
        orderBy: field === 'number' ? { number: dir } : { createdAt: dir },
        skip,
        take,
      }),
      prisma.receipt.count({ where }),
    ]);

    return c.json(listEnvelope(rows.map(serializeReceiptListItem), total, page, pageSize));
  })

  /** GET /api/admin/receipts/:id — full receipt for the print view. */
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const r = await prisma.receipt.findUnique({ where: { id } });
    if (!r) return c.json({ error: 'Receipt not found' }, 404);
    return c.json(serializeReceiptDetail(r));
  })

  /**
   * POST /api/admin/receipts — issue a receipt, from a paid booking or by hand.
   * Booking receipts snapshot the trip + captured payment and are idempotent per
   * booking (re-issuing returns the existing one). Manual receipts are ISK.
   */
  .post('/', idempotencyMiddleware, zValidator('json', issueReceiptSchema), async (c) => {
    const body = c.req.valid('json');
    const idempotencyKey = c.req.header('idempotency-key');
    if (!idempotencyKey) return c.json({ error: 'Idempotency-Key header is required' }, 400);
    const actor = c.get('user');

    if (body.source === RECEIPT_SOURCES.BOOKING) {
      const booking = await prisma.booking.findUnique({
        where: { id: body.bookingId },
        include: {
          driver: { select: { name: true } },
          vehicle: { select: { licensePlate: true } },
          payments: { orderBy: { createdAt: 'desc' } },
          receipts: { take: 1 },
        },
      });
      if (!booking) return c.json({ error: 'Booking not found' }, 404);

      // One receipt per booking — re-issuing returns the existing record.
      if (booking.receipts.length > 0) {
        return c.json(serializeReceiptDetail(booking.receipts[0]!));
      }

      // A receipt is proof of payment: require a captured (SUCCEEDED) payment.
      const paid = booking.payments.find((p) => p.status === PAYMENT_STATUSES.SUCCEEDED);
      if (!paid) {
        return c.json({ error: 'Booking has no captured payment to receipt' }, 409);
      }

      const receipt = await prisma.receipt.create({
        data: {
          source: RECEIPT_SOURCES.BOOKING,
          bookingId: booking.id,
          issuedById: actor.id,
          issuedFor: booking.actualDropoffAt ?? booking.actualPickupAt ?? booking.scheduledTime,
          pickupAddress: booking.pickupAddress,
          dropoffAddress: booking.dropoffAddress,
          driverName: booking.driver?.name ?? null,
          vehiclePlate: booking.vehicle?.licensePlate ?? null,
          fareAmount: paid.amount,
          totalAmount: paid.amount,
          currency: paid.currency,
          amountISK: paid.amountISK,
          notes: body.notes ?? null,
        },
      });
      return c.json(serializeReceiptDetail(receipt), 201);
    }

    // MANUAL — whole-ISK in-car / cash ride typed in by the operator.
    const tip = body.tipAmountISK ?? null;
    const total = body.fareAmountISK + (tip ?? 0);
    const receipt = await prisma.receipt.create({
      data: {
        source: RECEIPT_SOURCES.MANUAL,
        issuedById: actor.id,
        issuedFor: body.issuedFor,
        pickupAddress: body.pickupAddress,
        dropoffAddress: body.dropoffAddress,
        driverName: body.driverName ?? null,
        vehiclePlate: body.vehiclePlate ?? null,
        cabNumber: body.cabNumber ?? null,
        fareAmount: body.fareAmountISK,
        tipAmount: tip,
        totalAmount: total,
        currency: 'ISK',
        amountISK: total,
        notes: body.notes ?? null,
      },
    });
    return c.json(serializeReceiptDetail(receipt), 201);
  });
