/**
 * Dev seed. Seeds pricing zones, exchange rates, online drivers with vehicles +
 * a document each, sample passengers, and bookings across the lifecycle, and
 * promotes the configured admin email to SUPER_ADMIN. Do NOT run against production.
 *
 * Assignable bookings (SEARCHING) get a REAL manual-capture Stripe test
 * PaymentIntent when STRIPE_SECRET_KEY is set, so the dispatcher assign → capture
 * path works end-to-end. Without a key they're seeded with a placeholder intent
 * (assign will surface a clear Stripe error — set a test key to demo capture).
 */
import { prisma } from '@/lib/db';
import { stripe } from '@/server/lib/stripe';
import { BOOKING_STATUSES, PAYMENT_STATUSES, type BookingStatus } from '@/lib/types';

type SeededUser = Awaited<ReturnType<typeof prisma.user.upsert>>;

const KEF = { lat: 63.985, lng: -22.605, address: 'Keflavíkurflugvöllur (KEF)' };
const RVK = { lat: 64.1466, lng: -21.9426, address: 'Reykjavík 101' };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Clerk owns identity, so the seed can't create a login. Account auth = sign up
 * via Clerk → the Clerk webhook creates a Postgres User (PASSENGER) → promote
 * here. This grants the role to an already-synced user by email; if they haven't
 * signed up yet it prints instructions (re-run after signing up). See the
 * prod-railway-topology-and-clerk note: admin = manual SUPER_ADMIN promote.
 */
async function promoteByEmail(email: string, role: 'SUPER_ADMIN' | 'DISPATCHER'): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.warn(
      `[seed] ${email} not found — sign in via Clerk at /sign-in first, then re-run db:seed to grant ${role}.`,
    );
    return;
  }
  if (user.role !== role) {
    await prisma.user.update({ where: { id: user.id }, data: { role } });
  }
  console.log(`[seed] ${email} → ${role}`);
}

/** Create a manual-capture test intent already at requires_capture, or null. */
async function createCapturableIntent(amountISK: number): Promise<string | null> {
  try {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amountISK / 100) * 100,
      currency: 'isk',
      capture_method: 'manual',
      confirm: true,
      payment_method: 'pm_card_visa',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });
    return pi.status === 'requires_capture' ? pi.id : null;
  } catch (e) {
    console.warn('[seed] Stripe intent failed (set STRIPE_SECRET_KEY for assignable demo):', (e as Error).message);
    return null;
  }
}

async function main() {
  // --- Staff: promote Clerk-synced users by email --------------------------
  await promoteByEmail(process.env.SEED_ADMIN_EMAIL ?? 'admin@hitch.is', 'SUPER_ADMIN');
  await promoteByEmail('dispatch@hitch.is', 'DISPATCHER');

  // --- Pricing zones -------------------------------------------------------
  const zones = [
    {
      name: { is: 'Keflavíkurflugvöllur', en: 'Keflavík Airport' },
      polygon: {
        type: 'Polygon',
        coordinates: [[[-22.636, 63.985], [-22.585, 63.985], [-22.585, 64.01], [-22.636, 64.01], [-22.636, 63.985]]],
      },
      baseFareISK: 2500,
      perKmRateISK: 380,
      airportSurchargeISK: 1500,
    },
    {
      name: { is: 'Reykjavík miðbær', en: 'Reykjavík Center' },
      polygon: {
        type: 'Polygon',
        coordinates: [[[-21.97, 64.13], [-21.9, 64.13], [-21.9, 64.16], [-21.97, 64.16], [-21.97, 64.13]]],
      },
      baseFareISK: 1500,
      perKmRateISK: 350,
      airportSurchargeISK: 0,
    },
    {
      name: { is: 'Bláa Lónið', en: 'Blue Lagoon' },
      polygon: {
        type: 'Polygon',
        coordinates: [[[-22.47, 63.87], [-22.43, 63.87], [-22.43, 63.89], [-22.47, 63.89], [-22.47, 63.87]]],
      },
      baseFareISK: 2000,
      perKmRateISK: 380,
      airportSurchargeISK: 0,
    },
  ];
  for (const zone of zones) {
    const existing = await prisma.pricingZone.findFirst({ where: { name: { equals: zone.name } } });
    if (!existing) await prisma.pricingZone.create({ data: zone });
  }

  // --- Exchange rates ------------------------------------------------------
  const rateSeeds = [
    { fromCurrency: 'ISK' as const, toCurrency: 'EUR' as const, rate: 0.0067 },
    { fromCurrency: 'ISK' as const, toCurrency: 'USD' as const, rate: 0.0072 },
    { fromCurrency: 'ISK' as const, toCurrency: 'ISK' as const, rate: 1.0 },
  ];
  for (const r of rateSeeds) {
    const existing = await prisma.exchangeRate.findFirst({
      where: { fromCurrency: r.fromCurrency, toCurrency: r.toCurrency },
    });
    if (!existing) await prisma.exchangeRate.create({ data: r });
  }

  // --- Drivers + vehicles + locations + a document -------------------------
  const driverSeeds = [
    { name: 'Stefán Jónsson', email: 'stefan@hitch.is', phone: '+3545550101', plate: 'AB-001', make: 'Toyota', model: 'Prius', type: 'SEDAN' as const, cap: 4, color: 'Hvítur' },
    { name: 'Anna Sigurðar', email: 'anna@hitch.is', phone: '+3545550102', plate: 'AB-002', make: 'Tesla', model: 'Model Y', type: 'SUV' as const, cap: 5, color: 'Svartur' },
    { name: 'Jón Gunnarsson', email: 'jon@hitch.is', phone: '+3545550103', plate: 'AB-003', make: 'Kia', model: 'Sorento', type: 'SUV' as const, cap: 6, color: 'Grár' },
    { name: 'María Ólafsdóttir', email: 'maria@hitch.is', phone: '+3545550104', plate: 'AB-004', make: 'Mercedes', model: 'V-Class', type: 'VAN' as const, cap: 8, color: 'Silfur' },
    { name: 'Ívar Þórsson', email: 'ivar@hitch.is', phone: '+3545550105', plate: 'AB-005', make: 'Toyota', model: 'Corolla', type: 'SEDAN' as const, cap: 4, color: 'Blár' },
    { name: 'Helga Björns', email: 'helga@hitch.is', phone: '+3545550106', plate: 'AB-006', make: 'Hyundai', model: 'Santa Fe', type: 'SUV' as const, cap: 5, color: 'Rauður' },
  ];
  const drivers: SeededUser[] = [];
  for (let i = 0; i < driverSeeds.length; i++) {
    const d = driverSeeds[i]!;
    const t = i / (driverSeeds.length - 1);
    const driver = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: { email: d.email, name: d.name, phone: d.phone, role: 'DRIVER', preferredLocale: 'is' },
    });
    drivers.push(driver);
    const vehicle = await prisma.vehicle.upsert({
      where: { licensePlate: d.plate },
      update: {},
      create: {
        driverId: driver.id,
        vehicleType: d.type,
        capacity: d.cap,
        licensePlate: d.plate,
        make: d.make,
        model: d.model,
        year: 2022,
        color: d.color,
      },
    });
    await prisma.driverLocation.upsert({
      where: { driverId: driver.id },
      update: { lat: lerp(KEF.lat, RVK.lat, t), lng: lerp(KEF.lng, RVK.lng, t), isOnline: true },
      create: {
        driverId: driver.id,
        lat: lerp(KEF.lat, RVK.lat, t),
        lng: lerp(KEF.lng, RVK.lng, t),
        heading: 45,
        isOnline: true,
      },
    });
    const hasDoc = await prisma.driverDocument.findFirst({ where: { driverId: driver.id } });
    if (!hasDoc) {
      await prisma.driverDocument.create({
        data: { driverId: driver.id, type: 'LICENSE', fileUrl: `drivers/${driver.id}/documents/license.pdf` },
      });
    }
    // expose vehicle id for assigned bookings
    (driver as { _vehicleId?: string })._vehicleId = vehicle.id;
  }

  // --- Passengers ----------------------------------------------------------
  const passengerSeeds = [
    { name: 'Guðrún Test', email: 'gudrun@example.com' },
    { name: 'Erik Hansen', email: 'erik@example.com' },
    { name: 'Sophie Martin', email: 'sophie@example.com' },
  ];
  const passengers: SeededUser[] = [];
  for (const p of passengerSeeds) {
    passengers.push(
      await prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: { email: p.email, name: p.name, role: 'PASSENGER', preferredLocale: 'en' },
      }),
    );
  }

  // --- Bookings (only when none exist, so re-runs stay idempotent) ----------
  const existingBookings = await prisma.booking.count();
  if (existingBookings === 0) {
    let n = 0;
    const mkBooking = async (opts: {
      status: BookingStatus;
      withDriver?: (typeof drivers)[number];
      paymentStatus: (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];
      captured?: boolean;
      realIntentId?: string | null;
    }) => {
      const passenger = passengers[n % passengers.length]!;
      n++;
      const basePriceISK = 12500;
      const booking = await prisma.booking.create({
        data: {
          passengerId: passenger.id,
          driverId: opts.withDriver?.id,
          vehicleId: (opts.withDriver as { _vehicleId?: string } | undefined)?._vehicleId,
          pickupLat: KEF.lat,
          pickupLng: KEF.lng,
          pickupAddress: KEF.address,
          dropoffLat: RVK.lat,
          dropoffLng: RVK.lng,
          dropoffAddress: RVK.address,
          pickupAirportCode: 'KEF',
          scheduledTime: new Date(Date.now() + 60 * 60 * 1000),
          vehicleTypeRequested: 'SEDAN',
          passengerCount: 2,
          estimatedDistanceKm: 49,
          basePriceISK,
          displayCurrency: 'ISK',
          displayPrice: basePriceISK,
          exchangeRate: 1,
          status: opts.status,
        },
      });
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          stripeIntentId: opts.realIntentId ?? `seed_${booking.id}`,
          amount: basePriceISK,
          currency: 'ISK',
          amountISK: basePriceISK,
          status: opts.paymentStatus,
          capturedAt: opts.captured ? new Date() : null,
        },
      });
      await prisma.bookingEvent.create({
        data: { bookingId: booking.id, type: 'CREATED', actorId: passenger.id, payload: {} },
      });
      await prisma.bookingEvent.create({
        data: {
          bookingId: booking.id,
          type: 'STATUS_CHANGED',
          payload: { to: opts.status },
        },
      });
      return booking;
    };

    // Completed (captured) — feeds revenue + driver recent trips
    for (let i = 0; i < 4; i++) {
      await mkBooking({
        status: BOOKING_STATUSES.COMPLETED,
        withDriver: drivers[i % drivers.length],
        paymentStatus: PAYMENT_STATUSES.SUCCEEDED,
        captured: true,
      });
    }
    // In transit (assigned)
    for (let i = 0; i < 2; i++) {
      await mkBooking({
        status: BOOKING_STATUSES.IN_TRANSIT,
        withDriver: drivers[i],
        paymentStatus: PAYMENT_STATUSES.SUCCEEDED,
        captured: true,
      });
    }
    // Pending payment
    for (let i = 0; i < 2; i++) {
      await mkBooking({
        status: BOOKING_STATUSES.PENDING_PAYMENT,
        paymentStatus: PAYMENT_STATUSES.REQUIRES_PAYMENT_METHOD,
      });
    }
    // Searching — assignable. Real Stripe test intent when possible.
    for (let i = 0; i < 2; i++) {
      const realIntentId = await createCapturableIntent(12500);
      await mkBooking({
        status: BOOKING_STATUSES.SEARCHING,
        paymentStatus: PAYMENT_STATUSES.REQUIRES_CAPTURE,
        realIntentId,
      });
    }
    console.log('[seed] created sample bookings');
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@hitch.is';
  console.log(
    `[seed] ${drivers.length} drivers · ${passengers.length} passengers · ${zones.length} zones. ` +
      `Admin: sign in via Clerk at /sign-in, then re-run db:seed to promote ${adminEmail} to SUPER_ADMIN.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
