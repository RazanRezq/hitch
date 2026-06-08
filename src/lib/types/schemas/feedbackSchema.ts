import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';
import { APP_TIMEZONE, LOCALES } from '../constants';

// True when a datetime string already carries an explicit offset (…Z or ±HH:mm).
const HAS_OFFSET = /([zZ])$|([+-]\d{2}:?\d{2})$/;

/**
 * Parse a datetime string into an absolute UTC Date.
 * - Naive (no offset) → interpreted as Iceland wall-clock (Atlantic/Reykjavik).
 *   This is the `datetime-local` case from the form.
 * - Offset-bearing (…Z / ±HH:mm) → respected as-is. This keeps the function
 *   idempotent: the client sends a naive string, the resolver converts it to a
 *   UTC Date, JSON serializes it back to …Z, and the server re-parses the same
 *   instant — no double conversion.
 */
function parseIncidentDate(value: string): Date {
  return HAS_OFFSET.test(value.trim()) ? new Date(value) : fromZonedTime(value, APP_TIMEZONE);
}

/**
 * Public incident / complaint report submitted from the in-vehicle QR form.
 * Shared FE/BE: the Hono route validates with `feedbackSubmitSchema`; the form
 * builds a localized variant via `createFeedbackSchema(messages)` so validation
 * copy goes through `t()` while the wire shape stays identical.
 *
 * Decoupled from Booking/User — driver/car is free text only.
 */

const MAX_DESCRIPTION = 5000;

export interface FeedbackMessages {
  emailRequired: string;
  emailInvalid: string;
  descriptionRequired: string;
  descriptionMax: string;
  incidentDateRequired: string;
  locationRequired: string;
}

const DEFAULT_MESSAGES: FeedbackMessages = {
  emailRequired: 'Email is required.',
  emailInvalid: 'Enter a valid email address.',
  descriptionRequired: 'Please describe what happened.',
  descriptionMax: `Description must be ${MAX_DESCRIPTION} characters or fewer.`,
  incidentDateRequired: 'Please enter when the incident happened.',
  locationRequired: 'Please enter where it happened.',
};

const optionalTrimmed = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export function createFeedbackSchema(messages: Partial<FeedbackMessages> = {}) {
  const m = { ...DEFAULT_MESSAGES, ...messages };

  return z.object({
    name: optionalTrimmed(200),
    phone: optionalTrimmed(40),
    email: z
      .string({ message: m.emailRequired })
      .trim()
      .min(1, m.emailRequired)
      .email(m.emailInvalid)
      .max(320),
    carNumber: optionalTrimmed(40),
    driverName: optionalTrimmed(200),
    // Required: where the incident happened. Pickup/drop-off stay optional.
    incidentLocation: z
      .string({ message: m.locationRequired })
      .trim()
      .min(1, m.locationRequired)
      .max(500),
    pickupLocation: optionalTrimmed(500),
    dropoffLocation: optionalTrimmed(500),
    // datetime-local sends naive "YYYY-MM-DDTHH:mm" → anchored to Iceland time.
    incidentDateTime: z
      .string({ message: m.incidentDateRequired })
      .trim()
      .min(1, m.incidentDateRequired)
      .transform((value, ctx) => {
        const date = parseIncidentDate(value);
        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: 'custom', message: m.incidentDateRequired });
          return z.NEVER;
        }
        return date;
      }),
    description: z
      .string({ message: m.descriptionRequired })
      .trim()
      .min(1, m.descriptionRequired)
      .max(MAX_DESCRIPTION, m.descriptionMax),
    requestRefund: z.boolean().default(false),
    notifyAuthorities: z.boolean().default(false),
    locale: z.enum(LOCALES).optional(),
    // Honeypot: real users never see or fill this. Bots do. Left unconstrained so
    // a filled value passes validation and is dropped silently by the route
    // (a 400 here would tell a bot it tripped the trap).
    website: z.string().optional(),
  });
}

export const feedbackSubmitSchema = createFeedbackSchema();
export type FeedbackSubmitInput = z.input<typeof feedbackSubmitSchema>;
export type FeedbackSubmitValues = z.output<typeof feedbackSubmitSchema>;

export const FEEDBACK_DESCRIPTION_MAX = MAX_DESCRIPTION;
