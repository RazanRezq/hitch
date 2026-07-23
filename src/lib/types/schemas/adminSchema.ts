import { z } from 'zod';
import { BOOKING_STATUSES, VEHICLE_TYPES, type BookingStatus, type VehicleType } from '../constants';

const BOOKING_STATUS_VALUES = Object.values(BOOKING_STATUSES) as [
  BookingStatus,
  ...BookingStatus[],
];

/** Booking status as a Zod enum, derived from the single source of truth. */
export const bookingStatusSchema = z.enum(BOOKING_STATUS_VALUES);

/** Shared pagination/search/sort for admin list endpoints (query params). */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).optional(),
  // `field:dir`, validated server-side against a per-resource allow-list.
  sort: z.string().max(40).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/** GET /api/admin/bookings query. */
export const adminBookingListQuerySchema = listQuerySchema.extend({
  status: bookingStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;

/** POST /api/admin/bookings/:id/assign body. */
export const assignDriverSchema = z.object({
  driverId: z.string().min(1),
});
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;

/**
 * POST /api/admin/bookings/:id/status body (staff status transition).
 * Named `admin*` to avoid colliding with the looser updateBookingStatusSchema
 * in bookingSchema.ts; this one validates `to` against the status enum.
 */
export const adminUpdateBookingStatusSchema = z.object({
  to: bookingStatusSchema,
  reason: z.string().max(500).optional(),
});
export type AdminUpdateBookingStatusInput = z.infer<typeof adminUpdateBookingStatusSchema>;

/**
 * POST /api/admin/bookings/:id/refund body. `amountMinor` (in the payment's
 * display currency minor units) refunds partially; omitted = full refund.
 */
export const adminRefundSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});
export type AdminRefundInput = z.infer<typeof adminRefundSchema>;

/**
 * GET /api/admin/earnings query — the payroll window over `scheduledTime`.
 * Defaults (month-to-date UTC) are applied server-side.
 */
export const adminEarningsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AdminEarningsQuery = z.infer<typeof adminEarningsQuerySchema>;

/** GET /api/admin/drivers query. */
export const adminDriverListQuerySchema = listQuerySchema.extend({
  online: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
export type AdminDriverListQuery = z.infer<typeof adminDriverListQuerySchema>;

/** POST /api/admin/drivers body. */
export const createDriverSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().min(3).max(32).optional(),
  avatarUrl: z.string().url().optional(),
});
export type CreateDriverInput = z.infer<typeof createDriverSchema>;

/** PATCH /api/admin/drivers/:id body. */
export const updateDriverSchema = createDriverSchema.partial();
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

/** POST /api/admin/drivers/:id/online body. */
export const setDriverOnlineSchema = z.object({ isOnline: z.boolean() });
export type SetDriverOnlineInput = z.infer<typeof setDriverOnlineSchema>;

const vehicleTypeSchema = z.enum(
  Object.values(VEHICLE_TYPES) as [VehicleType, ...VehicleType[]],
);

/** POST /api/admin/vehicles body. */
export const createVehicleSchema = z.object({
  driverId: z.string().min(1),
  vehicleType: vehicleTypeSchema,
  // number (not coerce) so the form's valueAsNumber input type matches the
  // output type — avoids the zodResolver input/output mismatch in react-hook-form.
  capacity: z.number().int().min(1).max(20),
  licensePlate: z.string().trim().min(1).max(16),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1980).max(2100),
  color: z.string().trim().min(1).max(40),
  isActive: z.boolean().optional(),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/** PATCH /api/admin/vehicles/:id body. */
export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
