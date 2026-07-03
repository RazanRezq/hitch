import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';
import { APP_TIMEZONE, RECEIPT_SOURCES } from '../constants';
import { listQuerySchema } from './adminSchema';

// True when a datetime string already carries an explicit offset (…Z or ±HH:mm).
const HAS_OFFSET = /([zZ])$|([+-]\d{2}:?\d{2})$/;

/**
 * Parse a datetime string to an absolute UTC Date. Naive (no offset) values —
 * the `datetime-local` case from the manual form — are read as Iceland
 * wall-clock; offset-bearing values are respected as-is so the transform is
 * idempotent across the resolver → JSON → server round-trip. Mirrors the
 * feedback schema's incident-date handling.
 */
function parseWallClock(value: string): Date {
  return HAS_OFFSET.test(value.trim()) ? new Date(value) : fromZonedTime(value, APP_TIMEZONE);
}

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const issuedForField = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    const date = parseWallClock(value);
    if (Number.isNaN(date.getTime())) {
      ctx.addIssue({ code: 'custom', message: 'Invalid date' });
      return z.NEVER;
    }
    return date;
  });

/**
 * Manual receipt fields (no discriminator) — the shape the admin form binds to
 * with react-hook-form. Amounts are whole ISK: in-car / cash rides are metered
 * in króna. `fareAmountISK` uses plain `number` (not coerce) so the form's
 * valueAsNumber input type matches — same reasoning as the vehicle schema.
 */
export const manualReceiptFormSchema = z.object({
  issuedFor: issuedForField,
  pickupAddress: z.string().trim().min(1).max(300),
  dropoffAddress: z.string().trim().min(1).max(300),
  driverName: optionalTrimmed(200),
  vehiclePlate: optionalTrimmed(16),
  cabNumber: optionalTrimmed(16),
  fareAmountISK: z.number().int().min(1),
  tipAmountISK: z.number().int().min(0).optional(),
  notes: optionalTrimmed(500),
});

/** POST /api/admin/receipts — manual entry for an in-car / cash ride. */
export const issueManualReceiptSchema = manualReceiptFormSchema.extend({
  source: z.literal(RECEIPT_SOURCES.MANUAL),
});

/** POST /api/admin/receipts — issue from an existing paid booking (snapshotted). */
export const issueBookingReceiptSchema = z.object({
  source: z.literal(RECEIPT_SOURCES.BOOKING),
  bookingId: z.string().min(1),
  notes: optionalTrimmed(500),
});

/** POST /api/admin/receipts body — issue from a booking or by hand. */
export const issueReceiptSchema = z.discriminatedUnion('source', [
  issueBookingReceiptSchema,
  issueManualReceiptSchema,
]);
export type IssueReceiptInput = z.input<typeof issueReceiptSchema>;
export type IssueReceiptValues = z.output<typeof issueReceiptSchema>;
export type ManualReceiptFormInput = z.input<typeof manualReceiptFormSchema>;
export type ManualReceiptFormValues = z.output<typeof manualReceiptFormSchema>;

/** GET /api/admin/receipts query. */
export const adminReceiptListQuerySchema = listQuerySchema.extend({
  source: z.enum([RECEIPT_SOURCES.BOOKING, RECEIPT_SOURCES.MANUAL]).optional(),
});
export type AdminReceiptListQuery = z.infer<typeof adminReceiptListQuerySchema>;
