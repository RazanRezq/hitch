import { z } from 'zod';
import { BOOKING_STATUSES, type BookingStatus } from '../constants';

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
