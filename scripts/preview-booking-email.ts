/**
 * Render the branded booking confirmation email to local HTML files for preview.
 *
 *   npx tsx scripts/preview-booking-email.ts
 *
 * Writes to .preview/ (git-ignored). Pure render — sends nothing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  buildBookingConfirmationEmail,
  type BookingConfirmationInput,
} from '@/server/services/booking/notify';
import type { Locale } from '@/lib/types';

const OUT_DIR = '.preview';

// A representative airport pickup with a flight number, priced in ISK.
const full: BookingConfirmationInput = {
  id: 'clz0preview000000000000000',
  code: 'HTCH-7K9P-XX42',
  pickupAddress: 'Keflavíkurflugvöllur (KEF), Komusvæði',
  dropoffAddress: 'Laugavegur 1, 101 Reykjavík',
  scheduledTime: new Date('2026-07-15T14:30:00Z'),
  passengerCount: 3,
  flightNumber: 'FI615',
  displayPrice: 25900,
  displayCurrency: 'ISK',
};

// EUR display, no flight number — verifies the optional row collapses and
// minor-unit (cents) formatting.
const eurNoFlight: BookingConfirmationInput = {
  ...full,
  code: 'HTCH-3M2A-QQ18',
  flightNumber: null,
  displayPrice: 17250, // €172.50
  displayCurrency: 'EUR',
};

const url = (locale: Locale, id: string) =>
  `http://localhost:3000/${locale}/book/confirmation/${id}?t=preview-guest-token`;

mkdirSync(OUT_DIR, { recursive: true });

const cases: Array<{ file: string; b: BookingConfirmationInput; locale: Locale }> = [
  { file: 'booking-email.is.html', b: full, locale: 'is' },
  { file: 'booking-email.en.html', b: full, locale: 'en' },
  { file: 'booking-email.eur.en.html', b: eurNoFlight, locale: 'en' },
];

for (const { file, b, locale } of cases) {
  const { subject, html } = buildBookingConfirmationEmail(b, locale, url(locale, b.id));
  writeFileSync(`${OUT_DIR}/${file}`, html);
  console.log(`✓ ${OUT_DIR}/${file}  —  subject: "${subject}"`);
}
