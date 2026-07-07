import isMessages from '@/../messages/is.json';
import enMessages from '@/../messages/en.json';
import { prisma } from '@/lib/db';
import { signGuestToken } from '@/server/lib/guestToken';
import { formatCurrencyMinor, formatDateTime, formatNumber } from '@/lib/i18n-shared';
import { LOCALES, type Currency, type Locale } from '@/lib/types';
import {
  BRAND,
  emailShell,
  escapeHtml,
  isEmailConfigured,
  referencePill,
  send,
} from '@/server/services/email/shell';

/**
 * Booking confirmation email — sent once, when payment is authorized and the
 * booking flips PENDING_PAYMENT → CONFIRMED (webhook worker). For guests the
 * link carries a fresh HMAC guest token (stateless, re-derivable), so this
 * email is the passenger's durable way back into their booking if they close
 * the confirmation tab.
 *
 * Best-effort: the caller fires-and-forgets; failures are logged, never thrown
 * past `notifyBookingConfirmed`. If no real Resend key is configured we skip
 * sending entirely and log a notice (same contract as feedback emails).
 */

const FROM = process.env.BOOKING_NOTIFY_FROM ?? 'Hitch <noreply@hitch.is>';

// Localized copy is sourced from the SAME message files the UI uses — trip
// field labels come from the booking wizard/confirmation screens so the email
// and the on-screen summary can never drift apart.
interface EmailCopy {
  subject: string;
  heading: string;
  body: string;
  viewCta: string;
  linkHint: string;
  detailsHeading: string;
  flightLabel: string;
  help: string;
  reassure: string;
}
interface FieldLabels {
  pickup: string;
  dropoff: string;
  when: string;
  pax: string;
  total: string;
}
const COPY: Record<Locale, { email: EmailCopy; referenceLabel: string; fields: FieldLabels }> = {
  is: {
    email: isMessages.book.email,
    referenceLabel: isMessages.book.confirmation.bookingIdLabel,
    fields: {
      pickup: isMessages.book.quote.pickup,
      dropoff: isMessages.book.quote.dropoff,
      when: isMessages.book.quote.when,
      pax: isMessages.book.quote.pax,
      total: isMessages.book.confirmation.total,
    },
  },
  en: {
    email: enMessages.book.email,
    referenceLabel: enMessages.book.confirmation.bookingIdLabel,
    fields: {
      pickup: enMessages.book.quote.pickup,
      dropoff: enMessages.book.quote.dropoff,
      when: enMessages.book.quote.when,
      pax: enMessages.book.quote.pax,
      total: enMessages.book.confirmation.total,
    },
  },
};

// Help phone is a single source (same number for both locales).
const HELP_PHONE = enMessages.landing.header.phone;

/** The subset of a booking (with passenger) the confirmation email needs. */
export interface BookingConfirmationInput {
  id: string;
  code: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledTime: Date;
  passengerCount: number;
  flightNumber: string | null;
  displayPrice: number;
  displayCurrency: Currency;
}

/**
 * Absolute confirmation-page URL. Guests get a re-derived HMAC token in the
 * `t` query param — same param the payment step uses — so the emailed link
 * restores access without a session.
 */
export function bookingConfirmationUrl(
  bookingId: string,
  locale: Locale,
  isGuest: boolean,
): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const token = isGuest ? `?t=${encodeURIComponent(signGuestToken(bookingId))}` : '';
  return `${base}/${locale}/book/confirmation/${bookingId}${token}`;
}

function ctaButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0">
      <tr><td style="background:${BRAND.bandBg};border-radius:999px;text-align:center">
        <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 30px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${escapeHtml(
          label,
        )}</a>
      </td></tr>
    </table>
  `;
}

function detailsTable(heading: string, rows: Array<[string, string]>): string {
  const cellLabel =
    'padding:6px 14px 6px 0;color:#6b7280;font-size:13px;vertical-align:top;white-space:nowrap;text-align:start';
  const cellValue = `padding:6px 0;color:${BRAND.text};font-size:13px;text-align:start`;
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td style="${cellLabel}">${escapeHtml(label)}</td><td style="${cellValue}">${escapeHtml(
          value,
        )}</td></tr>`,
    )
    .join('');
  return `
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid ${BRAND.border}">
      <p style="margin:0 0 12px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted};text-align:start">${escapeHtml(
        heading,
      )}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-family:'DM Sans',Helvetica,Arial,sans-serif;border-collapse:collapse;width:100%">${body}</table>
    </div>
  `;
}

/**
 * Build the confirmation email payload (subject + text + branded HTML).
 * Pure — no IO — so it can be previewed/tested without sending.
 */
export function buildBookingConfirmationEmail(
  booking: BookingConfirmationInput,
  locale: Locale,
  bookingUrl: string,
): { subject: string; text: string; html: string } {
  const { email: copy, referenceLabel, fields } = COPY[locale];
  const code = booking.code ?? booking.id;
  const subject = copy.subject.replace('{code}', code);
  const rows: Array<[string, string]> = [
    [fields.pickup, booking.pickupAddress],
    [fields.dropoff, booking.dropoffAddress],
    [fields.when, formatDateTime(booking.scheduledTime, locale)],
    [fields.pax, formatNumber(booking.passengerCount, locale)],
    ...(booking.flightNumber
      ? ([[copy.flightLabel, booking.flightNumber]] as Array<[string, string]>)
      : []),
    [fields.total, formatCurrencyMinor(booking.displayPrice, booking.displayCurrency, locale)],
  ];

  // Plain-text fallback (clients that don't render HTML).
  const text = [
    copy.heading,
    '',
    copy.body,
    '',
    `${referenceLabel}: ${code}`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `${copy.viewCta}: ${bookingUrl}`,
    copy.linkHint,
  ].join('\n');

  const headingHtml = `<h1 style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.text}">${escapeHtml(
    copy.heading,
  )}</h1>`;
  const paragraphsHtml = copy.body
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="margin:14px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.muted}">${escapeHtml(
          line,
        )}</p>`,
    )
    .join('');
  const linkHintHtml = `<p style="margin:12px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted}">${escapeHtml(
    copy.linkHint,
  )}</p>`;

  const inner = `${headingHtml}${paragraphsHtml}${referencePill(code, referenceLabel)}${ctaButton(
    copy.viewCta,
    bookingUrl,
  )}${linkHintHtml}${detailsTable(copy.detailsHeading, rows)}`;

  return {
    subject,
    text,
    html: emailShell({ locale, inner, help: copy.help, phone: HELP_PHONE, reassure: copy.reassure }),
  };
}

export async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn(
      `[booking.notify] RESEND_API_KEY not configured — skipping confirmation email for ${bookingId}. Set RESEND_API_KEY to enable booking emails.`,
    );
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { passenger: true },
  });
  if (!booking?.passenger?.email) return;

  const locale: Locale = (LOCALES as readonly string[]).includes(
    booking.passenger.preferredLocale,
  )
    ? (booking.passenger.preferredLocale as Locale)
    : 'is';
  const url = bookingConfirmationUrl(booking.id, locale, booking.passenger.isGuest);
  const { subject, text, html } = buildBookingConfirmationEmail(booking, locale, url);

  try {
    const id = await send('booking-confirmation', {
      from: FROM,
      to: booking.passenger.email,
      subject,
      text,
      html,
    });
    console.log(`[booking.notify] confirmation sent for ${booking.code ?? booking.id} — ${id}`);
  } catch (err) {
    console.error('[booking.notify] send failed:', err);
  }
}
