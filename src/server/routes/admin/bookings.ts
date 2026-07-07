import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@/lib/db';
import { prisma } from '@/lib/db';
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  adminBookingListQuerySchema,
  assignDriverSchema,
  adminUpdateBookingStatusSchema,
  adminRefundSchema,
  type BookingStatus,
} from '@/lib/types';
import type { AuthVariables } from '@/lib/auth/middleware';
import { idempotencyMiddleware } from '@/server/middleware/idempotency';
import { listEnvelope, paginate, parseSort } from '@/server/lib/list';
import { assertTransition, InvalidTransitionError } from '@/server/services/booking/state-machine';
import {
  capturePaymentIntent,
  voidPaymentIntent,
  retrievePaymentIntent,
  refundPaymentIntent,
} from '@/server/services/payments';
import { publishBookingUpdate } from '@/server/realtime/publish-booking';
import { publishDispatchEvent } from '@/server/realtime/publish-dispatch';
import { publishDriverJobsEvent } from '@/server/realtime/publish-driver-jobs';

const LIST_SORT_FIELDS = ['createdAt', 'scheduledTime', 'status'] as const;

const CANCEL_STATUSES: readonly BookingStatus[] = [
  BOOKING_STATUSES.CANCELLED_BY_PASSENGER,
  BOOKING_STATUSES.CANCELLED_BY_DRIVER,
  BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
];

function bookingOrderBy(
  field: string,
  dir: 'asc' | 'desc',
): Prisma.BookingOrderByWithRelationInput {
  if (field === 'scheduledTime') return { scheduledTime: dir };
  if (field === 'status') return { status: dir };
  return { createdAt: dir };
}

/**
 * Admin bookings API. Mounted under the /api/admin group, which already enforces
 * requireAuth + requireRole(SUPER_ADMIN|DISPATCHER) — so every handler can assume
 * a staff user on c.get('user'). Every status change writes a BookingEvent and
 * publishes a realtime nudge.
 */
export const adminBookingsRoute = new Hono<{ Variables: AuthVariables }>()
  /** GET /api/admin/bookings — filtered, paginated list. */
  .get('/', zValidator('query', adminBookingListQuerySchema), async (c) => {
    const { page, pageSize, q, sort, status, from, to } = c.req.valid('query');
    const { skip, take } = paginate(page, pageSize);
    const { field, dir } = parseSort(sort, LIST_SORT_FIELDS, { field: 'createdAt', dir: 'desc' });

    const where: Prisma.BookingWhereInput = {
      ...(status ? { status } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: 'insensitive' } },
              { flightNumber: { contains: q, mode: 'insensitive' } },
              { passenger: { name: { contains: q, mode: 'insensitive' } } },
              { passenger: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: bookingOrderBy(field, dir),
        skip,
        take,
        include: {
          passenger: { select: { id: true, name: true, email: true } },
          driver: { select: { id: true, name: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    const items = rows.map((b) => ({
      id: b.id,
      status: b.status,
      scheduledTime: b.scheduledTime,
      createdAt: b.createdAt,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      pickupAirportCode: b.pickupAirportCode,
      flightNumber: b.flightNumber,
      passengerCount: b.passengerCount,
      vehicleTypeRequested: b.vehicleTypeRequested,
      basePriceISK: b.basePriceISK,
      displayCurrency: b.displayCurrency,
      displayPrice: b.displayPrice,
      passenger: b.passenger
        ? { id: b.passenger.id, name: b.passenger.name, email: b.passenger.email }
        : null,
      driver: b.driver ? { id: b.driver.id, name: b.driver.name } : null,
    }));

    return c.json(listEnvelope(items, total, page, pageSize));
  })

  /** GET /api/admin/bookings/:id — full detail incl. event timeline + payments. */
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const b = await prisma.booking.findUnique({
      where: { id },
      include: {
        passenger: { select: { id: true, name: true, email: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true } },
        vehicle: true,
        payments: { orderBy: { createdAt: 'desc' } },
        events: {
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!b) return c.json({ error: 'Booking not found' }, 404);

    return c.json({
      id: b.id,
      status: b.status,
      scheduledTime: b.scheduledTime,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      pickup: { lat: b.pickupLat, lng: b.pickupLng, address: b.pickupAddress },
      dropoff: { lat: b.dropoffLat, lng: b.dropoffLng, address: b.dropoffAddress },
      pickupAirportCode: b.pickupAirportCode,
      flightNumber: b.flightNumber,
      vehicleTypeRequested: b.vehicleTypeRequested,
      passengerCount: b.passengerCount,
      estimatedDistanceKm: b.estimatedDistanceKm,
      basePriceISK: b.basePriceISK,
      displayCurrency: b.displayCurrency,
      displayPrice: b.displayPrice,
      exchangeRate: b.exchangeRate,
      cancellationReason: b.cancellationReason,
      passenger: b.passenger,
      driver: b.driver,
      vehicle: b.vehicle
        ? {
            id: b.vehicle.id,
            make: b.vehicle.make,
            model: b.vehicle.model,
            color: b.vehicle.color,
            licensePlate: b.vehicle.licensePlate,
            vehicleType: b.vehicle.vehicleType,
          }
        : null,
      payments: b.payments.map((p) => ({
        id: p.id,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        amountISK: p.amountISK,
        capturedAt: p.capturedAt,
        refundedAt: p.refundedAt,
        createdAt: p.createdAt,
      })),
      events: b.events.map((e) => ({
        id: e.id,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
        actor: e.actor,
      })),
    });
  })

  /**
   * POST /api/admin/bookings/:id/assign — assign a driver. With no driver app in
   * Phase 1, dispatcher assignment IS the "driver accept" → capture the payment.
   * Capture runs BEFORE the DB flip so a capture failure leaves the booking
   * assignable rather than ACCEPTED-but-uncaptured.
   */
  .post('/:id/assign', idempotencyMiddleware, zValidator('json', assignDriverSchema), async (c) => {
    const id = c.req.param('id');
    const { driverId } = c.req.valid('json');
    const idempotencyKey = c.req.header('idempotency-key');
    if (!idempotencyKey) return c.json({ error: 'Idempotency-Key header is required' }, 400);
    const actor = c.get('user');

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return c.json({ error: 'Booking not found' }, 404);

    try {
      assertTransition(booking.status, BOOKING_STATUSES.ACCEPTED);
    } catch (e) {
      if (e instanceof InvalidTransitionError) {
        return c.json({ error: `Cannot assign a booking in status ${booking.status}` }, 409);
      }
      throw e;
    }

    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      include: { vehiclesAsDriver: { where: { isActive: true }, take: 1 } },
    });
    if (!driver || driver.role !== 'DRIVER') return c.json({ error: 'Driver not found' }, 404);
    if (driver.vehiclesAsDriver.length === 0) {
      return c.json({ error: 'Driver has no active vehicle' }, 422);
    }
    const vehicleId = driver.vehiclesAsDriver[0].id;

    const payment = await prisma.payment.findFirst({
      where: { bookingId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) return c.json({ error: 'Booking has no payment to capture' }, 409);
    if (payment.status !== PAYMENT_STATUSES.REQUIRES_CAPTURE) {
      return c.json(
        { error: `Payment not ready for capture (status ${payment.status})` },
        409,
      );
    }

    // Money path — capture first (idempotent), then commit the assignment. A
    // capture failure must NOT 500: the most common cause is an expired hold
    // (Stripe auto-cancels uncaptured manual authorizations after 7 days) while
    // our Payment row still reads REQUIRES_CAPTURE. Catch it, check the intent's
    // real state, and reconcile the drift so the booking stops looking assignable.
    try {
      await capturePaymentIntent({
        intentId: payment.stripeIntentId,
        idempotencyKey: `assign:${id}:capture`,
      });
    } catch (captureErr) {
      console.error('[assign] capture failed', id, payment.stripeIntentId, captureErr);

      let intentStatus: string | undefined;
      try {
        intentStatus = (await retrievePaymentIntent(payment.stripeIntentId)).status;
      } catch {
        // Couldn't read the intent — fall through to the generic failure below.
      }

      // Definitive "the hold is gone": mark the payment/booking cancelled so the
      // dispatcher sees an expired authorization instead of a booking that keeps
      // failing to assign.
      if (intentStatus === 'canceled') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: PAYMENT_STATUSES.CANCELED },
          }),
          prisma.booking.update({
            where: { id },
            data: {
              status: BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
              cancellationReason: 'Payment authorization expired',
            },
          }),
          prisma.bookingEvent.create({
            data: {
              bookingId: id,
              type: 'STATUS_CHANGED',
              actorId: actor.id,
              payload: {
                from: booking.status,
                to: BOOKING_STATUSES.CANCELLED_BY_SYSTEM,
                reason: 'authorization_expired',
                intentStatus,
              },
            },
          }),
        ]);
        publishBookingUpdate(id, BOOKING_STATUSES.CANCELLED_BY_SYSTEM);
        return c.json(
          { error: 'Payment authorization has expired; the booking was cancelled.', code: 'AUTHORIZATION_EXPIRED' },
          409,
        );
      }

      // Anything else (transient Stripe error, unreadable intent) — leave state
      // untouched so a retry is safe, and surface the reason instead of a 500.
      const message = captureErr instanceof Error ? captureErr.message : 'Payment capture failed';
      return c.json({ error: `Payment capture failed: ${message}`, code: 'CAPTURE_FAILED' }, 502);
    }

    const from = booking.status;
    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: { driverId, vehicleId, status: BOOKING_STATUSES.ACCEPTED },
      }),
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: PAYMENT_STATUSES.SUCCEEDED, capturedAt: new Date() },
      }),
      prisma.bookingEvent.create({
        data: { bookingId: id, type: 'DRIVER_ASSIGNED', actorId: actor.id, payload: { driverId, vehicleId } },
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId: id,
          type: 'PAYMENT_CAPTURED',
          actorId: actor.id,
          payload: { paymentId: payment.id, amountISK: payment.amountISK },
        },
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId: id,
          type: 'STATUS_CHANGED',
          actorId: actor.id,
          payload: { from, to: BOOKING_STATUSES.ACCEPTED },
        },
      }),
    ]);

    publishBookingUpdate(id, BOOKING_STATUSES.ACCEPTED);
    publishDispatchEvent({ type: 'dispatch', action: 'assigned', bookingId: id, driverId });
    publishDriverJobsEvent(driverId, { type: 'jobs', action: 'assigned', bookingId: id });

    return c.json({ id, status: BOOKING_STATUSES.ACCEPTED, driverId, vehicleId });
  })

  /**
   * POST /api/admin/bookings/:id/status — staff status transition (validated by
   * the state machine). Voids the authorization when cancelling pre-capture.
   */
  .post(
    '/:id/status',
    idempotencyMiddleware,
    zValidator('json', adminUpdateBookingStatusSchema),
    async (c) => {
      const id = c.req.param('id');
      const { to, reason } = c.req.valid('json');
      const actor = c.get('user');

      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return c.json({ error: 'Booking not found' }, 404);
      const from = booking.status;

      try {
        assertTransition(from, to);
      } catch (e) {
        if (e instanceof InvalidTransitionError) return c.json({ error: e.message }, 409);
        throw e;
      }

      const payment = await prisma.payment.findFirst({
        where: { bookingId: id },
        orderBy: { createdAt: 'desc' },
      });
      const isCancel = CANCEL_STATUSES.includes(to);
      const voidable = !!payment && payment.status === PAYMENT_STATUSES.REQUIRES_CAPTURE && isCancel;

      if (voidable && payment) {
        try {
          await voidPaymentIntent({
            intentId: payment.stripeIntentId,
            idempotencyKey: `status:${id}:void`,
          });
        } catch (err) {
          // Already voided/captured — log and continue; webhook reconciles.
          console.warn('[admin.status] void failed', payment.stripeIntentId, err);
        }
      }

      await prisma.$transaction([
        prisma.booking.update({
          where: { id },
          data: { status: to, ...(isCancel && reason ? { cancellationReason: reason } : {}) },
        }),
        ...(voidable && payment
          ? [
              prisma.payment.update({
                where: { id: payment.id },
                data: { status: PAYMENT_STATUSES.CANCELED },
              }),
            ]
          : []),
        prisma.bookingEvent.create({
          data: { bookingId: id, type: 'STATUS_CHANGED', actorId: actor.id, payload: { from, to, reason } },
        }),
      ]);

      publishBookingUpdate(id, to);
      if (to === BOOKING_STATUSES.SEARCHING) {
        publishDispatchEvent({ type: 'dispatch', action: 'enqueue', bookingId: id });
      } else if (isCancel || to === BOOKING_STATUSES.COMPLETED) {
        publishDispatchEvent({ type: 'dispatch', action: 'removed', bookingId: id });
      }
      // Nudge the assigned driver's job list too — their job may have been
      // cancelled, completed on their behalf, or otherwise touched by staff.
      if (booking.driverId) {
        publishDriverJobsEvent(booking.driverId, {
          type: 'jobs',
          action: (TERMINAL_BOOKING_STATUSES as readonly BookingStatus[]).includes(to)
            ? 'removed'
            : 'updated',
          bookingId: id,
        });
      }

      return c.json({ id, status: to });
    },
  )

  /**
   * POST /api/admin/bookings/:id/refund — refund a CAPTURED payment, full by
   * default or partial via `amountMinor`. A refund is a payment action, not a
   * status transition: the dispatcher cancels/no-shows the booking separately
   * when appropriate. The payment row is updated optimistically from Stripe's
   * synchronous response; the charge.refunded webhook reconciles it as well
   * (covers refunds issued from the Stripe dashboard too).
   */
  .post(
    '/:id/refund',
    idempotencyMiddleware,
    zValidator('json', adminRefundSchema),
    async (c) => {
      const id = c.req.param('id');
      const { amountMinor, reason } = c.req.valid('json');
      const actor = c.get('user');

      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return c.json({ error: 'Booking not found' }, 404);

      const payment = await prisma.payment.findFirst({
        where: { bookingId: id },
        orderBy: { createdAt: 'desc' },
      });
      const refundable =
        payment &&
        (payment.status === PAYMENT_STATUSES.SUCCEEDED ||
          payment.status === PAYMENT_STATUSES.PARTIALLY_REFUNDED);
      if (!payment || !refundable) {
        return c.json(
          { error: 'No captured payment to refund', code: 'NOT_REFUNDABLE' },
          409,
        );
      }
      if (amountMinor !== undefined && amountMinor > payment.amount) {
        return c.json({ error: 'Refund exceeds the captured amount' }, 400);
      }

      let refund;
      try {
        // Key includes the amount so an identical retry replays (no double
        // refund) while a different partial amount is a distinct refund.
        refund = await refundPaymentIntent({
          intentId: payment.stripeIntentId,
          idempotencyKey: `refund:${id}:${amountMinor ?? 'full'}`,
          amount: amountMinor,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Refund failed';
        console.error('[admin.refund] Stripe refund failed', payment.stripeIntentId, err);
        return c.json({ error: message, code: 'REFUND_FAILED' }, 502);
      }

      const full = amountMinor === undefined || amountMinor >= payment.amount;
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: full ? PAYMENT_STATUSES.REFUNDED : PAYMENT_STATUSES.PARTIALLY_REFUNDED,
            ...(full ? { refundedAt: new Date() } : {}),
          },
        }),
        prisma.bookingEvent.create({
          data: {
            bookingId: id,
            type: 'PAYMENT_REFUNDED',
            actorId: actor.id,
            payload: {
              refundId: refund.id,
              amountMinor: amountMinor ?? payment.amount,
              currency: payment.currency,
              full,
              reason,
            },
          },
        }),
      ]);

      return c.json({
        id,
        refundId: refund.id,
        paymentStatus: full ? PAYMENT_STATUSES.REFUNDED : PAYMENT_STATUSES.PARTIALLY_REFUNDED,
      });
    },
  );
