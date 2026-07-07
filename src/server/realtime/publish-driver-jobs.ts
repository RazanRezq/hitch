import { WS_CHANNELS } from '@/lib/types';
import { publishToRedis } from './redis-pubsub';

/**
 * Job-list events for a driver's private `driver:{id}:jobs` channel (RBAC in
 * realtime/authorize.ts — that driver only). Like the dispatch events, these
 * are a nudge to refetch the jobs query, not a data feed: `assigned` fires when
 * the dispatcher gives the driver a job, `removed` when a job leaves their
 * plate (cancelled / no-show / completed by staff), `updated` on any other
 * staff change to one of their bookings.
 */
export type DriverJobsEvent =
  | { type: 'jobs'; action: 'assigned'; bookingId: string }
  | { type: 'jobs'; action: 'updated'; bookingId: string }
  | { type: 'jobs'; action: 'removed'; bookingId: string };

export function publishDriverJobsEvent(driverId: string, event: DriverJobsEvent): void {
  void publishToRedis(WS_CHANNELS.driverJobs(driverId), event).catch((err) =>
    console.error('[realtime] publishDriverJobsEvent failed', driverId, event, err),
  );
}
