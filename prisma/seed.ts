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

  // --- Bookings + ratings ---------------------------------------------------
  // SEED_RESET=1 wipes existing mock bookings so the set can be regenerated
  // (e.g. after fixing the Stripe key, to mint real capturable intents).
  if (process.env.SEED_RESET) {
    await prisma.rating.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.booking.deleteMany({}); // cascades BookingEvent + TripLocationHistory
    console.log('[seed] SEED_RESET — cleared existing bookings, payments, ratings');
  }
  const existingBookings = await prisma.booking.count();
  if (existingBookings === 0) {
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    type PaymentStatusValue = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

    // A few corridor destinations so the list/map aren't all the same trip.
    const BLU = { lat: 63.8804, lng: -22.4495, address: 'Bláa Lónið' };
    const HFJ = { lat: 64.0671, lng: -21.9396, address: 'Hafnarfjörður' };
    const KOP = { lat: 64.1109, lng: -21.9128, address: 'Kópavogur' };
    const ROUTES = [
      { from: KEF, to: RVK, km: 49, priceISK: 14900, vt: 'SEDAN' as const, fromAirport: true },
      { from: RVK, to: KEF, km: 49, priceISK: 14900, vt: 'SUV' as const, fromAirport: false },
      { from: KEF, to: BLU, km: 25, priceISK: 11900, vt: 'SUV' as const, fromAirport: true },
      { from: KEF, to: HFJ, km: 40, priceISK: 12900, vt: 'SEDAN' as const, fromAirport: true },
      { from: KEF, to: KOP, km: 43, priceISK: 13500, vt: 'VAN' as const, fromAirport: true },
    ];

    let seq = 0;
    const mkBooking = async (opts: {
      status: BookingStatus;
      driver?: SeededUser | null;
      paymentStatus: PaymentStatusValue;
      capturedAt?: Date | null;
      createdAt?: Date;
      realIntentId?: string | null;
      rate?: number;
    }) => {
      const route = ROUTES[seq % ROUTES.length]!;
      const passenger = passengers[seq % passengers.length]!;
      seq++;
      const created = opts.createdAt ?? new Date(now);
      const booking = await prisma.booking.create({
        data: {
          passengerId: passenger.id,
          driverId: opts.driver?.id,
          vehicleId: (opts.driver as { _vehicleId?: string } | undefined)?._vehicleId,
          pickupLat: route.from.lat,
          pickupLng: route.from.lng,
          pickupAddress: route.from.address,
          dropoffLat: route.to.lat,
          dropoffLng: route.to.lng,
          dropoffAddress: route.to.address,
          pickupAirportCode: route.fromAirport ? 'KEF' : null,
          flightNumber: route.fromAirport ? `FI${300 + seq}` : null,
          scheduledTime: new Date(created.getTime() + 60 * 60 * 1000),
          vehicleTypeRequested: route.vt,
          passengerCount: 1 + (seq % 4),
          estimatedDistanceKm: route.km,
          basePriceISK: route.priceISK,
          displayCurrency: 'ISK',
          displayPrice: route.priceISK,
          exchangeRate: 1,
          status: opts.status,
          createdAt: created,
        },
      });
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          stripeIntentId: opts.realIntentId ?? `seed_${booking.id}`,
          amount: route.priceISK,
          currency: 'ISK',
          amountISK: route.priceISK,
          status: opts.paymentStatus,
          capturedAt: opts.capturedAt ?? null,
        },
      });
      await prisma.bookingEvent.createMany({
        data: [
          { bookingId: booking.id, type: 'CREATED', actorId: passenger.id },
          { bookingId: booking.id, type: 'STATUS_CHANGED', payload: { to: opts.status } },
        ],
      });
      if (opts.driver && opts.rate) {
        await prisma.rating.create({
          data: {
            bookingId: booking.id,
            raterId: passenger.id,
            rateeId: opts.driver.id,
            score: opts.rate,
            comment: opts.rate >= 5 ? 'Great ride, right on time.' : 'Good trip.',
          },
        });
      }
      return booking;
    };

    // 14 completed across the last 7 days (revenue trend; 3 captured today) + ratings.
    for (let i = 0; i < 14; i++) {
      const daysAgo = i < 3 ? 0 : i % 7;
      const created = new Date(now - daysAgo * DAY - 3 * 60 * 60 * 1000);
      await mkBooking({
        status: BOOKING_STATUSES.COMPLETED,
        driver: drivers[i % drivers.length],
        paymentStatus: PAYMENT_STATUSES.SUCCEEDED,
        capturedAt: new Date(created.getTime() + 2 * 60 * 60 * 1000),
        createdAt: created,
        rate: 4 + (i % 2),
      });
    }
    // Active trips (assigned).
    for (let i = 0; i < 3; i++)
      await mkBooking({ status: BOOKING_STATUSES.IN_TRANSIT, driver: drivers[i], paymentStatus: PAYMENT_STATUSES.SUCCEEDED, capturedAt: new Date(now) });
    for (let i = 0; i < 2; i++)
      await mkBooking({ status: BOOKING_STATUSES.ACCEPTED, driver: drivers[i + 1], paymentStatus: PAYMENT_STATUSES.SUCCEEDED, capturedAt: new Date(now) });
    await mkBooking({ status: BOOKING_STATUSES.DRIVER_ARRIVING, driver: drivers[3], paymentStatus: PAYMENT_STATUSES.SUCCEEDED, capturedAt: new Date(now) });
    // Pending payment + terminal variety.
    for (let i = 0; i < 2; i++)
      await mkBooking({ status: BOOKING_STATUSES.PENDING_PAYMENT, paymentStatus: PAYMENT_STATUSES.REQUIRES_PAYMENT_METHOD });
    for (let i = 0; i < 2; i++)
      await mkBooking({ status: BOOKING_STATUSES.CANCELLED_BY_PASSENGER, paymentStatus: PAYMENT_STATUSES.CANCELED, createdAt: new Date(now - (i + 1) * DAY) });
    await mkBooking({ status: BOOKING_STATUSES.NO_SHOW, driver: drivers[0], paymentStatus: PAYMENT_STATUSES.SUCCEEDED, capturedAt: new Date(now - DAY) });
    // Assignable now: CONFIRMED + SEARCHING get real manual-capture Stripe test intents.
    for (let i = 0; i < 2; i++) {
      const realIntentId = await createCapturableIntent(13900);
      await mkBooking({ status: BOOKING_STATUSES.CONFIRMED, paymentStatus: PAYMENT_STATUSES.REQUIRES_CAPTURE, realIntentId });
    }
    for (let i = 0; i < 4; i++) {
      const realIntentId = await createCapturableIntent(13900);
      await mkBooking({ status: BOOKING_STATUSES.SEARCHING, paymentStatus: PAYMENT_STATUSES.REQUIRES_CAPTURE, realIntentId });
    }
    console.log('[seed] created 31 bookings (+ ratings) across the lifecycle');
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
