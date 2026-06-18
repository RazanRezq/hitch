/**
 * Render the branded feedback auto-reply email to local HTML files for preview.
 *
 *   npx tsx scripts/preview-feedback-email.ts
 *
 * Writes to .preview/ (git-ignored). Pure render — sends nothing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildCustomerAutoReply, businessHtml } from '@/server/services/feedback/notify';
import type { Feedback } from '@/lib/db';

const OUT_DIR = '.preview';

// A representative, fully-populated report.
const full: Feedback = {
  id: 'clz0preview000000000000000',
  reference: 'RPT-3J4H-734G',
  name: 'Anna Jónsdóttir',
  phone: '+354 555 1234',
  email: 'passenger@example.com',
  bookingReference: 'HTCH-7K9P-XX42',
  carNumber: 'AB-123',
  driverName: 'Driver Example',
  incidentLocation: 'Keflavík Airport, Terminal',
  pickupLocation: 'KEF Airport',
  dropoffLocation: 'Reykjavík, Laugavegur 1',
  incidentDateTime: new Date('2026-06-17T14:05:00Z'),
  description:
    'The driver took a longer route than necessary and was on the phone for most of the trip.\nI felt unsafe and would like this reviewed.',
  requestRefund: true,
  notifyAuthorities: false,
  attachments: ['complaints/evidence/abc/photo1.jpg', 'complaints/evidence/abc/photo2.jpg'],
  consent: true,
  locale: 'en',
  createdAt: new Date('2026-06-17T14:10:00Z'),
} as Feedback;

// A minimal report (only required fields) — verifies empty rows collapse.
const minimal: Feedback = {
  ...full,
  reference: 'RPT-9X2M-AA10',
  name: null,
  phone: null,
  bookingReference: null,
  carNumber: null,
  driverName: null,
  pickupLocation: null,
  dropoffLocation: null,
  requestRefund: false,
  attachments: [],
  description: 'Stutt lýsing á atviki.',
  locale: 'is',
} as Feedback;

mkdirSync(OUT_DIR, { recursive: true });

const cases: Array<{ file: string; f: Feedback; locale: 'is' | 'en' }> = [
  { file: 'feedback-email.en.html', f: { ...full, locale: 'en' } as Feedback, locale: 'en' },
  { file: 'feedback-email.is.html', f: { ...full, locale: 'is' } as Feedback, locale: 'is' },
  { file: 'feedback-email.minimal.is.html', f: minimal, locale: 'is' },
];

for (const { file, f, locale } of cases) {
  const { subject, html } = buildCustomerAutoReply(f, locale);
  writeFileSync(`${OUT_DIR}/${file}`, html);
  console.log(`✓ ${OUT_DIR}/${file}  —  subject: "${subject}"`);
}

// Internal business notification (English labels, mock signed evidence links).
const mockLinks = full.attachments.map((key, i) => ({
  name: key.split('/').pop() ?? `file-${i + 1}`,
  url: '#evidence-link',
}));
writeFileSync(`${OUT_DIR}/feedback-email.business.html`, businessHtml(full, mockLinks));
console.log(`✓ ${OUT_DIR}/feedback-email.business.html  —  internal notification`);
