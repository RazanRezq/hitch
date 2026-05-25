import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  createBookingSchema,
} from '@/lib/types';
import { auth } from '@/lib/auth';
import { stripe } from '@/server/lib/stripe';
import { signGuestToken, verifyGuestToken } from '@/server/lib/guestToken';
import { idempotencyMiddleware } from '@/server/middleware/idempotency';
import { createPaymentIntent } from '@/server/services/payments';
import { getQuote } from '@/server/services/pricing/quote';

async function getSessionUserId(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

type BookingRow = NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>>;
type AuthResult =
  | { ok: true; booking: BookingRow }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Authorize access to a booking by either an authenticated owner or a valid
 * guest token (HMAC over bookingId). Returns the booking row when authorized,
 * or a 401/403/404 error.
 */
async function authorizeBookingAccess(
  bookingId: string,
  sessionUserId: string | null,
  guestToken: string | undefined,
): Promise<AuthResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, status: 404, error: 'Booking not found' };

  if (sessionUserId && booking.passengerId === sessionUserId) {
    return { ok: true, booking };
  }
  if (guestToken && verifyGuestToken(bookingId, guestToken)) {
    return { ok: true, booking };
  }
  return { ok: false, status: sessionUserId ? 403 : 401, error: 'Forbidden' };
}

const cancelInputSchema = z
  .object({ reason: z.string().max(500).optional() })
  .optional();

export const bookingsRoute = new Hono()
  /**
   * POST /api/bookings — create a booking and a manual-capture Stripe
   * PaymentIntent. Requires Idempotency-Key header. Guest checkout is supported
   * by passing `guest: { email, phone, name }` when there's no session.
   *
   * Flow:
   *  1. Resolve passenger (session or guest upsert).
   *  2. Ensure passenger.stripeCustomerId.
   *  3. Server-side getQuote (never trust client price).
   *  4. Create Booking in DRAFT.
   *  5. Create Stripe PaymentIntent (manual capture).
   *  6. Tx: flip Booking → PENDING_PAYMENT, insert Payment + BookingEvent CREATED.
   */
  .post('/', idempotencyMiddleware, zValidator('json', createBookingSchema), async (c) => {
    const body = c.req.valid('json');
    const idempotencyKey = c.req.header('idempotency-key');
    if (!idempotencyKey) {
      return c.json({ error: 'Idempotency-Key header is required' }, 400);
    }

    const sessionUserId = await getSessionUserId(c.req.raw.headers);

    let passenger: Awaited<ReturnType<typeof prisma.user.findUnique>>;
    if (sessionUserId) {
      passenger = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (!passenger) return c.json({ error: 'Session user not found' }, 401);
    } else {
      if (!body.guest) {
        return c.json(
          { error: 'Authentication required, or provide guest details' },
          401,
        );
      }
      passenger = await prisma.user.upsert({
        where: { email: body.guest.email },
        update: { name: body.guest.name, phone: body.guest.phone },
        create: {
          email: body.guest.email,
          phone: body.guest.phone,
          name: body.guest.name,
          role: 'PASSENGER',
          isGuest: true,
          preferredCurrency: body.displayCurrency ?? 'ISK',
        },
      });
    }

    // Ensure Stripe customer
    let stripeCustomerId = passenger.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create(
        {
          email: passenger.email,
          name: passenger.name ?? undefined,
          phone: passenger.phone ?? undefined,
          metadata: { userId: passenger.id },
        },
        { idempotencyKey: `customer:${passenger.id}` },
      );
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: passenger.id },
        data: { stripeCustomerId },
      });
    }

    // Re-quote server-side — never trust client price
    const quote = await getQuote({
      pickup: body.pickup,
      dropoff: body.dropoff,
      displayCurrency: body.displayCurrency,
    });

    // 1. Create booking in DRAFT (cheap to clean up if Stripe fails)
    const booking = await prisma.booking.create({
      data: {
        passengerId: passenger.id,
        pickupLat: body.pickup.lat,
        pickupLng: body.pickup.lng,
        pickupAddress: body.pickup.address,
        dropoffLat: body.dropoff.lat,
        dropoffLng: body.dropoff.lng,
        dropoffAddress: body.dropoff.address,
        pickupAirportCode: body.pickupAirportCode,
        flightNumber: body.flightNumber,
        scheduledTime: body.scheduledTime,
        vehicleTypeRequested: body.vehicleTypeRequested,
        passengerCount: body.passengerCount,
        estimatedDistanceKm: quote.distanceKm,
        basePriceISK: quote.basePriceISK,
        displayCurrency: quote.displayCurrency,
        displayPrice: quote.displayPrice,
        exchangeRate: quote.exchangeRate,
        status: BOOKING_STATUSES.DRAFT,
      },
    });

    // 2. Stripe PaymentIntent (manual capture, idempotent by booking id)
    const intent = await createPaymentIntent({
      amount: quote.displayPrice,
      currency: quote.displayCurrency,
      customerId: stripeCustomerId,
      metadata: { bookingId: booking.id, passengerId: passenger.id },
      idempotencyKey: `booking:${booking.id}:intent`,
    });

    // 3. Tx: flip booking + insert Payment + BookingEvent
    const isGuest = passenger.isGuest;
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: BOOKING_STATUSES.PENDING_PAYMENT },
      }),
      prisma.payment.create({
        data: {
          bookingId: booking.id,
          stripeIntentId: intent.id,
          amount: quote.displayPrice,
          currency: quote.displayCurrency,
          amountISK: quote.basePriceISK,
          status: PAYMENT_STATUSES.REQUIRES_PAYMENT_METHOD,
        },
      }),
      prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: 'CREATED',
          actorId: passenger.id,
          payload: {
            quoteSnapshot: {
              basePriceISK: quote.basePriceISK,
              displayCurrency: quote.displayCurrency,
              displayPrice: quote.displayPrice,
              exchangeRate: quote.exchangeRate,
              distanceKm: quote.distanceKm,
              isAirportTrip: quote.isAirportTrip,
            },
            idempotencyKey,
            isGuest,
            stripeIntentId: intent.id,
          },
        },
      }),
    ]);

    const guestToken = isGuest ? signGuestToken(booking.id) : undefined;

    return c.json({
      bookingId: booking.id,
      clientSecret: intent.client_secret,
      displayPrice: quote.displayPrice,
      displayCurrency: quote.displayCurrency,
      status: BOOKING_STATUSES.PENDING_PAYMENT,
      guestToken,
    });
  })

  /**
   * GET /api/bookings/:id — fetch a booking. Authorized by session ownership
   * OR a ?t=<guestToken> query param.
   */
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const guestToken = c.req.query('t');
    const sessionUserId = await getSessionUserId(c.req.raw.headers);

    const result = await authorizeBookingAccess(id, sessionUserId, guestToken);
    if (!result.ok) return c.json({ error: result.error }, result.status);

    const b = result.booking;
    return c.json({
      id: b.id,
      status: b.status,
      scheduledTime: b.scheduledTime,
      pickup: { lat: b.pickupLat, lng: b.pickupLng, address: b.pickupAddress },
      dropoff: { lat: b.dropoffLat, lng: b.dropoffLng, address: b.dropoffAddress },
      pickupAirportCode: b.pickupAirportCode,
      flightNumber: b.flightNumber,
      vehicleTypeRequested: b.vehicleTypeRequested,
      passengerCount: b.passengerCount,
      basePriceISK: b.basePriceISK,
      displayCurrency: b.displayCurrency,
      displayPrice: b.displayPrice,
      exchangeRate: b.exchangeRate,
      estimatedDistanceKm: b.estimatedDistanceKm,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    });
  })

  /**
   * POST /api/bookings/:id/cancel — passenger cancellation. Only valid while
   * status is PENDING_PAYMENT. Voids the PaymentIntent on Stripe.
   */
  .post(
    '/:id/cancel',
    idempotencyMiddleware,
    zValidator('json', cancelInputSchema),
    async (c) => {
      const id = c.req.param('id');
      const guestToken = c.req.query('t');
      const reason = (c.req.valid('json') as { reason?: string } | undefined)?.reason;
      const sessionUserId = await getSessionUserId(c.req.raw.headers);

      const access = await authorizeBookingAccess(id, sessionUserId, guestToken);
      if (!access.ok) return c.json({ error: access.error }, access.status);

      const booking = access.booking;
      if (booking.status !== BOOKING_STATUSES.PENDING_PAYMENT) {
        return c.json(
          { error: `Cannot cancel booking in status ${booking.status}` },
          409,
        );
      }

      const payment = await prisma.payment.findFirst({
        where: { bookingId: booking.id },
        orderBy: { createdAt: 'desc' },
      });
      if (payment) {
        try {
          await stripe.paymentIntents.cancel(payment.stripeIntentId);
        } catch (err) {
          // Already canceled or otherwise unrecoverable — log and continue so
          // we still record the cancellation in our DB. Webhook will reconcile.
          console.warn('[cancel] Stripe cancel failed', payment.stripeIntentId, err);
        }
      }

      await prisma.$transaction([
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: BOOKING_STATUSES.CANCELLED_BY_PASSENGER,
            cancellationReason: reason,
          },
        }),
        ...(payment
          ? [
              prisma.payment.update({
                where: { id: payment.id },
                data: { status: PAYMENT_STATUSES.CANCELED },
              }),
            ]
          : []),
        prisma.bookingEvent.create({
          data: {
            bookingId: booking.id,
            type: 'STATUS_CHANGED',
            actorId: sessionUserId,
            payload: {
              from: booking.status,
              to: BOOKING_STATUSES.CANCELLED_BY_PASSENGER,
              reason,
            },
          },
        }),
      ]);

      return c.json({
        id: booking.id,
        status: BOOKING_STATUSES.CANCELLED_BY_PASSENGER,
      });
    },
  );
