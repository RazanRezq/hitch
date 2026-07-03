/**
 * Render the branded fare receipt to local HTML files for a quick visual preview
 * — no dev server, no Clerk login required.
 *
 *   npx tsx scripts/preview-receipt.ts
 *
 * Writes to .preview/ (git-ignored) and renders the REAL <ReceiptDocument/>
 * component, styled via the Tailwind Play CDN so it looks like the in-app view.
 * Pure render — touches nothing in the database.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import isMessages from '../messages/is.json';
import enMessages from '../messages/en.json';
import { APP_TIMEZONE, type Locale } from '@/lib/types';
import { ReceiptDocument } from '@/components/admin/ReceiptDocument';
import type { AdminReceiptDetail } from '@/lib/api-client/hooks/admin';

const OUT_DIR = '.preview';

// A booking-sourced receipt (snapshotted from a completed KEF → Blue Lagoon trip).
const bookingReceipt: AdminReceiptDetail = {
  id: 'preview-booking',
  number: 'R00001',
  source: 'BOOKING',
  bookingId: 'cmqgipz6xxxx',
  issuedFor: '2026-06-30T09:00:00.000Z',
  pickupAddress: 'Keflavíkurflugvöllur (KEF)',
  dropoffAddress: 'Bláa Lónið',
  driverName: 'Jón Gunnarsson',
  vehiclePlate: 'AB-003',
  cabNumber: null,
  fareAmount: 11900,
  tipAmount: null,
  totalAmount: 11900,
  currency: 'ISK',
  amountISK: 11900,
  notes: null,
  createdAt: '2026-06-30T09:20:00.000Z',
};

// A manual in-car / cash receipt — the client's paper sample (cab 101 / FSY44).
const manualReceipt: AdminReceiptDetail = {
  id: 'preview-manual',
  number: 'R00003',
  source: 'MANUAL',
  bookingId: null,
  issuedFor: '2026-06-30T09:00:00.000Z',
  pickupAddress: 'Brautholt 10, 105 Reykjavík',
  dropoffAddress: 'Austurhraun 7, 210 Garðabær',
  driverName: 'Yousef',
  vehiclePlate: 'FSY44',
  cabNumber: '101',
  fareAmount: 7000,
  tipAmount: null,
  totalAmount: 7000,
  currency: 'ISK',
  amountISK: 7000,
  notes: null,
  createdAt: '2026-06-30T09:14:00.000Z',
};

const MESSAGES: Record<Locale, unknown> = { is: isMessages, en: enMessages };

function renderReceipt(receipt: AdminReceiptDetail, locale: Locale): string {
  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale, messages: MESSAGES[locale] as Record<string, unknown>, timeZone: APP_TIMEZONE },
      createElement(ReceiptDocument, { receipt, locale }),
    ),
  );
}

function page(locale: Locale): string {
  const cards = [
    { caption: 'Booking receipt (auto-filled from a completed trip)', r: bookingReceipt },
    { caption: 'Manual receipt (in-car / cash — typed in)', r: manualReceipt },
  ]
    .map(
      ({ caption, r }) => `
      <p style="margin:0 0 .5rem;font:600 13px system-ui;color:#6b7280">${caption}</p>
      <div class="rounded-2xl border bg-white shadow-sm" style="margin-bottom:2.5rem">
        ${renderReceipt(r, locale)}
      </div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${locale}" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hitch receipt preview (${locale})</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background:#f3f4f6; padding:2rem; }
    /* project custom utility, not in the CDN */
    .text-ltr { direction:ltr; unicode-bidi:embed; text-align:start; }
  </style>
</head>
<body>
  <div style="max-width:48rem;margin:0 auto">${cards}</div>
</body>
</html>`;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const locale of ['is', 'en'] as const) {
  const file = `${OUT_DIR}/receipt.${locale}.html`;
  writeFileSync(file, page(locale));
  console.log(`✓ ${file}`);
}
console.log('\nOpen a file above in your browser (e.g. open .preview/receipt.is.html).');
