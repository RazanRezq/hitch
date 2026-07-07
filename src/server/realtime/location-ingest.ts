import { prisma } from '@/lib/db';
import {
  BOOKING_STATUSES,
  USER_ROLES,
  WS_CHANNELS,
  driverLocationFrameSchema,
} from '@/lib/types';
import { redis } from '../lib/redis';
import { publishDriverLocation } from './publish-driver-location';
import { publishToRedis } from './redis-pubsub';
import type { WsAuth } from './authorize';

/**
 * Per-connection ingest for driver GPS frames, per CLAUDE.md "Driver Location":
 * the driver page pushes `{ action: 'location', lat, lng, heading?, bookingId? }`
 * every 3-5s while on shift. Each frame:
 *
 *   1. fans out live to the staff-only `driver-locations` channel (dispatcher map),
 *   2. refreshes the Redis hot cache (1min TTL),
 *   3. when it carries the driver's OWN live job: relays to that `booking:{id}`
 *      channel (the passenger may watch the car only during their active trip)
 *      and — while IN_TRANSIT — records a TripLocationHistory breadcrumb ~every 10s,
 *   4. upserts DriverLocation in Postgres ~every 15s (never per-frame).
 *
 * An `offline` frame or a socket close mid-shift marks the driver off shift so
 * the live map sheds ghost cars. Frames from non-driver connections are
 * dropped. Every handler is fire-and-forget-safe: it never throws into the WS
 * message loop.
 */

const REDIS_TTL_SECONDS = 60;
const DB_WRITE_INTERVAL_MS = 15_000;
const HISTORY_WRITE_INTERVAL_MS = 10_000;
// How long a bookingId ownership/status check stays trusted before re-reading —
// bounds both the per-frame DB load and how long a stale bookingId keeps relaying.
const BOOKING_RECHECK_INTERVAL_MS = 30_000;

/** Redis key for a driver's last-seen position (hot cache). */
export const driverLocationKey = (driverId: string) => `driverloc:${driverId}`;

/** Relay to the passenger only while their trip is actually live. */
const RELAY_STATUSES: readonly string[] = [
  BOOKING_STATUSES.DRIVER_ARRIVING,
  BOOKING_STATUSES.DRIVER_ARRIVED,
  BOOKING_STATUSES.IN_TRANSIT,
];

interface BookingCheck {
  bookingId: string;
  relay: boolean;
  inTransit: boolean;
  checkedAt: number;
}

export class DriverLocationIngest {
  private lastDbWriteAt = 0;
  private lastHistoryWriteAt = 0;
  private bookingCheck: BookingCheck | null = null;
  private lastPosition: { lat: number; lng: number; heading: number | null } | null = null;
  /** True once this socket streamed a location — drives offline-on-close. */
  private streaming = false;

  constructor(private readonly getAuth: () => Promise<WsAuth>) {}

  async handleLocation(frame: unknown): Promise<void> {
    try {
      const parsed = driverLocationFrameSchema.safeParse(frame);
      if (!parsed.success) return;
      const auth = await this.getAuth();
      if (auth.role !== USER_ROLES.DRIVER || !auth.userId) return;

      const driverId = auth.userId;
      const { lat, lng, bookingId } = parsed.data;
      const heading = parsed.data.heading ?? null;
      const now = Date.now();
      this.streaming = true;
      this.lastPosition = { lat, lng, heading };

      // 1. Live fan-out to the dispatcher map.
      publishDriverLocation({ driverId, lat, lng, heading, isOnline: true });

      // 2. Redis hot cache — authoritative "last seen" with a 1min TTL.
      void redis
        .set(
          driverLocationKey(driverId),
          JSON.stringify({ lat, lng, heading, at: new Date().toISOString() }),
          'EX',
          REDIS_TTL_SECONDS,
        )
        .catch((err) => console.error('[location-ingest] redis cache failed', driverId, err));

      // 3. Trip relay + breadcrumbs, only for the driver's own live job.
      const check = await this.checkBooking(driverId, bookingId ?? null, now);
      if (check?.relay) {
        void publishToRedis(WS_CHANNELS.booking(check.bookingId), {
          type: 'driver_location',
          bookingId: check.bookingId,
          lat,
          lng,
          heading,
        }).catch((err) =>
          console.error('[location-ingest] booking relay failed', check.bookingId, err),
        );

        if (check.inTransit && now - this.lastHistoryWriteAt >= HISTORY_WRITE_INTERVAL_MS) {
          this.lastHistoryWriteAt = now;
          await prisma.tripLocationHistory.create({
            data: { bookingId: check.bookingId, lat, lng },
          });
        }
      }

      // 4. Throttled Postgres upsert — never per-frame.
      if (now - this.lastDbWriteAt >= DB_WRITE_INTERVAL_MS) {
        this.lastDbWriteAt = now;
        await prisma.driverLocation.upsert({
          where: { driverId },
          update: { lat, lng, heading, isOnline: true },
          create: { driverId, lat, lng, heading, isOnline: true },
        });
      }
    } catch (err) {
      console.error('[location-ingest] location frame failed', err);
    }
  }

  /** Explicit end-of-shift (`offline` frame). */
  async setOffline(): Promise<void> {
    try {
      const auth = await this.getAuth();
      if (auth.role !== USER_ROLES.DRIVER || !auth.userId) return;
      const driverId = auth.userId;
      this.streaming = false;

      const res = await prisma.driverLocation.updateMany({
        where: { driverId },
        data: { isOnline: false },
      });
      void redis.del(driverLocationKey(driverId)).catch(() => {});
      if (res.count > 0 && this.lastPosition) {
        publishDriverLocation({ driverId, ...this.lastPosition, isOnline: false });
      }
    } catch (err) {
      console.error('[location-ingest] offline failed', err);
    }
  }

  /** Socket dropped mid-shift → best-effort offline so the map sheds ghost cars. */
  async handleClose(): Promise<void> {
    if (!this.streaming) return;
    await this.setOffline();
  }

  private async checkBooking(
    driverId: string,
    bookingId: string | null,
    now: number,
  ): Promise<BookingCheck | null> {
    if (!bookingId) {
      this.bookingCheck = null;
      return null;
    }
    const cached = this.bookingCheck;
    if (cached && cached.bookingId === bookingId && now - cached.checkedAt < BOOKING_RECHECK_INTERVAL_MS) {
      return cached;
    }
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { driverId: true, status: true },
    });
    const relay = !!booking && booking.driverId === driverId && RELAY_STATUSES.includes(booking.status);
    const check: BookingCheck = {
      bookingId,
      relay,
      inTransit: relay && booking?.status === BOOKING_STATUSES.IN_TRANSIT,
      checkedAt: now,
    };
    this.bookingCheck = check;
    return check;
  }
}
