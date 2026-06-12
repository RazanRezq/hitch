import { WS_CHANNELS } from '@/lib/types';
import { publishToRedis } from './redis-pubsub';

export interface DriverLocationUpdate {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  isOnline?: boolean;
}

/**
 * Best-effort realtime push of a driver's position to the staff-only
 * `driver-locations` channel (RBAC enforced in realtime/authorize.ts). Mirrors
 * publishBookingUpdate: fire-and-forget, never throws into the caller. Published
 * from the driver app (Phase 2) or the dev simulator; bridged Redis → WS.
 */
export function publishDriverLocation(loc: DriverLocationUpdate): void {
  void publishToRedis(WS_CHANNELS.driverLocations, { type: 'location', ...loc }).catch((err) =>
    console.error('[realtime] publishDriverLocation failed', loc.driverId, err),
  );
}
