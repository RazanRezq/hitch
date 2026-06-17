/**
 * Dev driver simulator. Moves seeded drivers along the KEF ↔ Reykjavík corridor
 * and publishes their positions to the `driver-locations` realtime channel every
 * ~3s (the dispatcher live map subscribes via `npm run ws`). Throttles
 * DriverLocation DB writes to ~every 15s per CLAUDE.md.
 *
 * Run after `npm run db:seed`, with `npm run ws` up:  npm run simulate
 */
import { prisma } from '@/lib/db';
import { publishDriverLocation } from '@/server/realtime/publish-driver-location';

const KEF = { lat: 63.985, lng: -22.605 };
const RVK = { lat: 64.1466, lng: -21.9426 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TICK_MS = 3000;
const DB_EVERY = 5; // ticks → ~15s

interface DriverState {
  lat: number;
  lng: number;
  t: number;
  dir: number;
}

async function main() {
  const drivers = await prisma.user.findMany({ where: { role: 'DRIVER' }, select: { id: true } });
  if (drivers.length === 0) {
    console.log('No drivers found. Run `npm run db:seed` first.');
    await prisma.$disconnect();
    return;
  }

  const state = new Map<string, DriverState>();
  drivers.forEach((d, i) => {
    const t0 = drivers.length > 1 ? i / (drivers.length - 1) : 0;
    state.set(d.id, {
      lat: lerp(KEF.lat, RVK.lat, t0),
      lng: lerp(KEF.lng, RVK.lng, t0),
      t: t0,
      dir: i % 2 === 0 ? 1 : -1,
    });
  });

  let tick = 0;
  console.log(`Simulating ${drivers.length} drivers along KEF ↔ Reykjavík (Ctrl+C to stop)…`);

  const interval = setInterval(() => {
    tick++;
    for (const [id, s] of state) {
      s.t += s.dir * 0.02;
      if (s.t >= 1) {
        s.t = 1;
        s.dir = -1;
      }
      if (s.t <= 0) {
        s.t = 0;
        s.dir = 1;
      }
      const jitter = (Math.random() - 0.5) * 0.004;
      s.lat = lerp(KEF.lat, RVK.lat, s.t) + jitter;
      s.lng = lerp(KEF.lng, RVK.lng, s.t) + jitter;
      publishDriverLocation({
        driverId: id,
        lat: s.lat,
        lng: s.lng,
        heading: s.dir > 0 ? 45 : 225,
        isOnline: true,
      });
    }

    if (tick % DB_EVERY === 0) {
      void Promise.all(
        [...state].map(([id, s]) =>
          prisma.driverLocation.upsert({
            where: { driverId: id },
            update: { lat: s.lat, lng: s.lng, isOnline: true },
            create: { driverId: id, lat: s.lat, lng: s.lng, heading: 45, isOnline: true },
          }),
        ),
      ).catch((e) => console.error('[simulate] db write failed', e));
    }
  }, TICK_MS);

  const shutdown = async () => {
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main();
