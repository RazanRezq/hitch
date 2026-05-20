/**
 * Dev seed. Creates a super admin, three pricing zones (KEF, Reykjavík, Blue
 * Lagoon), and sample exchange rates. Do NOT run against production.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@hitch.is';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Hitch Admin',
      role: 'SUPER_ADMIN',
      preferredLocale: 'is',
      preferredCurrency: 'ISK',
    },
  });

  // Pricing zones — minimal GeoJSON placeholders
  const zones = [
    {
      name: {
        is: 'Keflavíkurflugvöllur',
        en: 'Keflavík Airport',
        ar: 'مطار كيفلافيك',
      },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [-22.636, 63.985],
            [-22.585, 63.985],
            [-22.585, 64.01],
            [-22.636, 64.01],
            [-22.636, 63.985],
          ],
        ],
      },
      baseFareISK: 2500,
      perKmRateISK: 380,
      airportSurchargeISK: 1500,
    },
    {
      name: { is: 'Reykjavík miðbær', en: 'Reykjavík Center', ar: 'وسط ريكيافيك' },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [-21.97, 64.13],
            [-21.9, 64.13],
            [-21.9, 64.16],
            [-21.97, 64.16],
            [-21.97, 64.13],
          ],
        ],
      },
      baseFareISK: 1500,
      perKmRateISK: 350,
      airportSurchargeISK: 0,
    },
    {
      name: { is: 'Bláa Lónið', en: 'Blue Lagoon', ar: 'البحيرة الزرقاء' },
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [-22.47, 63.87],
            [-22.43, 63.87],
            [-22.43, 63.89],
            [-22.47, 63.89],
            [-22.47, 63.87],
          ],
        ],
      },
      baseFareISK: 2000,
      perKmRateISK: 380,
      airportSurchargeISK: 0,
    },
  ];

  for (const zone of zones) {
    const existing = await prisma.pricingZone.findFirst({
      where: {
        name: { equals: zone.name },
      },
    });
    if (!existing) {
      await prisma.pricingZone.create({ data: zone });
    }
  }

  // Exchange rates (illustrative; real values replaced by exchange-rate worker)
  await prisma.exchangeRate.createMany({
    data: [
      { fromCurrency: 'ISK', toCurrency: 'EUR', rate: 0.0067 },
      { fromCurrency: 'ISK', toCurrency: 'USD', rate: 0.0072 },
      { fromCurrency: 'ISK', toCurrency: 'ISK', rate: 1.0 },
    ],
  });

  console.log(`Seeded admin user ${admin.email}, ${zones.length} pricing zones, exchange rates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
