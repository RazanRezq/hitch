import type { BookingStatus } from '@/lib/types';
import { WS_CHANNELS } from '@/lib/types';
import { publishToRedis } from './redis-pubsub';

/**
 * Best-effort realtime push of a booking status change to its `booking:{id}`
 * channel. Fire-and-forget: never throws into the caller — realtime delivery is
 * only a nudge for subscribed clients to refetch the authoritative record, and
 * the booking-status poll remains the fallback if Redis/WS is unavailable.
 *
 * Works from any process (Next.js API route, BullMQ workers) since it publishes
 * to Redis; the WS server bridges Redis → connected sockets via initRedisPubSub.
 */
export function publishBookingUpdate(bookingId: string, status: BookingStatus): void {
  void publishToRedis(WS_CHANNELS.booking(bookingId), {
    type: 'status',
    bookingId,
    status,
  }).catch((err) => console.error('[realtime] publishBookingUpdate failed', bookingId, err));
}
