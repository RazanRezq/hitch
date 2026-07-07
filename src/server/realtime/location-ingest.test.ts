import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WsAuth } from './authorize';

const h = vi.hoisted(() => ({
  prisma: {
    booking: { findUnique: vi.fn() },
    driverLocation: { upsert: vi.fn(), updateMany: vi.fn() },
    tripLocationHistory: { create: vi.fn() },
  },
  redis: { set: vi.fn(), del: vi.fn() },
  publishDriverLocation: vi.fn(),
  publishToRedis: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: h.prisma }));
vi.mock('../lib/redis', () => ({ redis: h.redis }));
vi.mock('./publish-driver-location', () => ({ publishDriverLocation: h.publishDriverLocation }));
vi.mock('./redis-pubsub', () => ({ publishToRedis: h.publishToRedis }));

import { DriverLocationIngest, driverLocationKey } from './location-ingest';

const BASE = new Date('2026-07-07T12:00:00Z').getTime();

const driverAuth = async (): Promise<WsAuth> => ({ userId: 'driver-1', role: 'DRIVER' });
const passengerAuth = async (): Promise<WsAuth> => ({ userId: 'pax-1', role: 'PASSENGER' });

function frame(overrides: Record<string, unknown> = {}) {
  return { action: 'location', lat: 64.0, lng: -22.0, heading: 90, bookingId: null, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(BASE);
  h.redis.set.mockResolvedValue('OK');
  h.redis.del.mockResolvedValue(1);
  h.publishToRedis.mockResolvedValue(undefined);
  h.prisma.driverLocation.upsert.mockResolvedValue({});
  h.prisma.driverLocation.updateMany.mockResolvedValue({ count: 1 });
  h.prisma.tripLocationHistory.create.mockResolvedValue({});
  h.prisma.booking.findUnique.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('handleLocation', () => {
  it('drops frames from non-driver connections', async () => {
    const ingest = new DriverLocationIngest(passengerAuth);
    await ingest.handleLocation(frame());
    expect(h.publishDriverLocation).not.toHaveBeenCalled();
    expect(h.prisma.driverLocation.upsert).not.toHaveBeenCalled();
  });

  it('drops malformed frames', async () => {
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame({ lat: 999 }));
    await ingest.handleLocation({ action: 'location' });
    expect(h.publishDriverLocation).not.toHaveBeenCalled();
  });

  it('fans out live, refreshes the hot cache and upserts DriverLocation', async () => {
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame());

    expect(h.publishDriverLocation).toHaveBeenCalledWith({
      driverId: 'driver-1',
      lat: 64.0,
      lng: -22.0,
      heading: 90,
      isOnline: true,
    });
    expect(h.redis.set).toHaveBeenCalledWith(
      driverLocationKey('driver-1'),
      expect.any(String),
      'EX',
      60,
    );
    expect(h.prisma.driverLocation.upsert).toHaveBeenCalledTimes(1);
  });

  it('throttles Postgres writes to ~15s while publishing every frame', async () => {
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame());
    vi.setSystemTime(BASE + 4_000);
    await ingest.handleLocation(frame());
    vi.setSystemTime(BASE + 8_000);
    await ingest.handleLocation(frame());
    expect(h.publishDriverLocation).toHaveBeenCalledTimes(3);
    expect(h.prisma.driverLocation.upsert).toHaveBeenCalledTimes(1);

    vi.setSystemTime(BASE + 16_000);
    await ingest.handleLocation(frame());
    expect(h.prisma.driverLocation.upsert).toHaveBeenCalledTimes(2);
  });

  it('relays to the booking channel and breadcrumbs IN_TRANSIT trips (10s throttle)', async () => {
    h.prisma.booking.findUnique.mockResolvedValue({ driverId: 'driver-1', status: 'IN_TRANSIT' });
    const ingest = new DriverLocationIngest(driverAuth);

    await ingest.handleLocation(frame({ bookingId: 'bk-1' }));
    expect(h.publishToRedis).toHaveBeenCalledWith('booking:bk-1', {
      type: 'driver_location',
      bookingId: 'bk-1',
      lat: 64.0,
      lng: -22.0,
      heading: 90,
    });
    expect(h.prisma.tripLocationHistory.create).toHaveBeenCalledTimes(1);

    vi.setSystemTime(BASE + 4_000);
    await ingest.handleLocation(frame({ bookingId: 'bk-1' }));
    expect(h.publishToRedis).toHaveBeenCalledTimes(2); // relay is per-frame…
    expect(h.prisma.tripLocationHistory.create).toHaveBeenCalledTimes(1); // …breadcrumbs are not

    vi.setSystemTime(BASE + 12_000);
    await ingest.handleLocation(frame({ bookingId: 'bk-1' }));
    expect(h.prisma.tripLocationHistory.create).toHaveBeenCalledTimes(2);

    // Ownership/status was verified once and cached (30s), not re-read per frame.
    expect(h.prisma.booking.findUnique).toHaveBeenCalledTimes(1);
  });

  it("never relays another driver's booking", async () => {
    h.prisma.booking.findUnique.mockResolvedValue({ driverId: 'driver-2', status: 'IN_TRANSIT' });
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame({ bookingId: 'bk-9' }));
    expect(h.publishToRedis).not.toHaveBeenCalled();
    expect(h.prisma.tripLocationHistory.create).not.toHaveBeenCalled();
  });

  it('relays while DRIVER_ARRIVING but records no breadcrumbs', async () => {
    h.prisma.booking.findUnique.mockResolvedValue({
      driverId: 'driver-1',
      status: 'DRIVER_ARRIVING',
    });
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame({ bookingId: 'bk-1' }));
    expect(h.publishToRedis).toHaveBeenCalledTimes(1);
    expect(h.prisma.tripLocationHistory.create).not.toHaveBeenCalled();
  });

  it('does not relay pre-assignment statuses', async () => {
    h.prisma.booking.findUnique.mockResolvedValue({ driverId: 'driver-1', status: 'ACCEPTED' });
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame({ bookingId: 'bk-1' }));
    expect(h.publishToRedis).not.toHaveBeenCalled();
  });
});

describe('offline handling', () => {
  it('setOffline flips the DB flag, drops the cache and tells the map', async () => {
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame());
    h.publishDriverLocation.mockClear();

    await ingest.setOffline();
    expect(h.prisma.driverLocation.updateMany).toHaveBeenCalledWith({
      where: { driverId: 'driver-1' },
      data: { isOnline: false },
    });
    expect(h.redis.del).toHaveBeenCalledWith(driverLocationKey('driver-1'));
    expect(h.publishDriverLocation).toHaveBeenCalledWith({
      driverId: 'driver-1',
      lat: 64.0,
      lng: -22.0,
      heading: 90,
      isOnline: false,
    });
  });

  it('handleClose is a no-op for sockets that never streamed', async () => {
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleClose();
    expect(h.prisma.driverLocation.updateMany).not.toHaveBeenCalled();
  });

  it('handleClose marks a streaming driver offline (no ghost cars)', async () => {
    const ingest = new DriverLocationIngest(driverAuth);
    await ingest.handleLocation(frame());
    await ingest.handleClose();
    expect(h.prisma.driverLocation.updateMany).toHaveBeenCalledWith({
      where: { driverId: 'driver-1' },
      data: { isOnline: false },
    });
  });

  it('setOffline ignores non-driver connections', async () => {
    const ingest = new DriverLocationIngest(passengerAuth);
    await ingest.setOffline();
    expect(h.prisma.driverLocation.updateMany).not.toHaveBeenCalled();
  });
});
