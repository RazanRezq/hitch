import { WS_CHANNELS } from '@/lib/types';
import { publishToRedis } from './redis-pubsub';

/**
 * Dispatch-queue events for the staff-only `dispatch:global` channel. The
 * dispatcher dashboard treats these as a nudge to refetch the pending-bookings
 * queue (server state stays owned by TanStack Query), so the payload is a small
 * discriminated signal rather than a full record.
 */
export type DispatchEvent =
  | { type: 'dispatch'; action: 'enqueue'; bookingId: string }
  | { type: 'dispatch'; action: 'assigned'; bookingId: string; driverId: string }
  | { type: 'dispatch'; action: 'removed'; bookingId: string };

export function publishDispatchEvent(event: DispatchEvent): void {
  void publishToRedis(WS_CHANNELS.dispatchGlobal, event).catch((err) =>
    console.error('[realtime] publishDispatchEvent failed', event, err),
  );
}
