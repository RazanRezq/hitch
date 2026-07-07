import { z } from 'zod';
import { BOOKING_STATUSES, type BookingStatus } from '../constants';

/**
 * Statuses a driver may move a job INTO — the targets of DRIVER_NEXT_STATUS
 * (constants.ts). Which one is legal for a given job is enforced server-side
 * against the job's current status; this enum only bounds the request body.
 */
const DRIVER_ADVANCE_TARGETS = [
  BOOKING_STATUSES.DRIVER_ARRIVING,
  BOOKING_STATUSES.DRIVER_ARRIVED,
  BOOKING_STATUSES.IN_TRANSIT,
  BOOKING_STATUSES.COMPLETED,
] as [BookingStatus, ...BookingStatus[]];

/** POST /api/driver/jobs/:id/advance body. */
export const driverAdvanceSchema = z.object({
  to: z.enum(DRIVER_ADVANCE_TARGETS),
});
export type DriverAdvanceInput = z.infer<typeof driverAdvanceSchema>;

/**
 * Inbound WS frame a driver client pushes every 3-5s while on shift (alongside
 * the subscribe/unsubscribe frames every client uses). Shared FE/BE so the
 * driver page and the ingest (server/realtime/location-ingest.ts) never drift.
 */
export const driverLocationFrameSchema = z.object({
  action: z.literal('location'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).nullish(),
  /**
   * Set while the driver has an in-progress job — after server-side ownership
   * checks it enables the passenger-facing relay and IN_TRANSIT breadcrumbs.
   */
  bookingId: z.string().min(1).nullish(),
});
export type DriverLocationFrame = z.infer<typeof driverLocationFrameSchema>;
