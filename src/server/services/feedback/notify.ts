import isMessages from '@/../messages/is.json';
import enMessages from '@/../messages/en.json';
import { resend } from '@/server/lib/resend';
import { getDownloadUrl } from '@/server/services/storage';
import { LOCALES, type Locale } from '@/lib/types';
import type { Feedback } from '@/lib/db';

// Evidence links in the internal email live long enough for a reviewer to open
// them within the 2-business-day SLA. 7 days is the SigV4 presigned-URL maximum.
const ATTACHMENT_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

interface AttachmentLink {
  name: string;
  url: string;
}

/**
 * Dual email dispatch for an incident report:
 *   1. business notification (full detail, internal)
 *   2. customer auto-reply (confirmation + reference + a copy of their report)
 *
 * Both sends are best-effort: failures are caught and logged here so the
 * caller's request never fails on email problems (the DB row is already saved
 * by the time we're called).
 *
 * If no real Resend API key is configured we skip sending entirely and log a
 * notice — this is the "plug in your keys later" path, so local/dev and any
 * not-yet-provisioned environment stay quiet instead of erroring per submit.
 */

const FROM = process.env.FEEDBACK_NOTIFY_FROM ?? 'Hitch <noreply@hitch.is>';
const BUSINESS_TO = process.env.FEEDBACK_NOTIFY_TO ?? 'business@hitch.is';

// Localized copy is sourced from the SAME message files the UI uses, so the
// email and the on-screen success state can never drift apart. Label values are
// typed as `string` (not the JSON literal types) so both locales assign.
type FieldLabels = Record<keyof typeof enMessages.feedback.fields, string>;
const COPY: Record<
  Locale,
  {
    autoReply: { subject: string; body: string; copyHeading: string };
    fields: FieldLabels;
    referenceLabel: string;
    attachmentsLabel: string;
    help: string;
    reassure: string;
  }
> = {
  is: {
    autoReply: isMessages.feedback.autoReply,
    fields: isMessages.feedback.fields,
    referenceLabel: isMessages.feedback.referenceLabel,
    attachmentsLabel: isMessages.feedback.attachmentsLabel,
    help: isMessages.feedback.help,
    reassure: isMessages.feedback.reassure,
  },
  en: {
    autoReply: enMessages.feedback.autoReply,
    fields: enMessages.feedback.fields,
    referenceLabel: enMessages.feedback.referenceLabel,
    attachmentsLabel: enMessages.feedback.attachmentsLabel,
    help: enMessages.feedback.help,
    reassure: enMessages.feedback.reassure,
  },
};

// Help phone is a single source (same number for both locales).
const HELP_PHONE = enMessages.landing.header.phone;

// Email-safe brand palette. Inline hex only — email clients don't understand
// our OKLCH design tokens, and gradients degrade to the solid `bandBg` in
// Outlook (which ignores background-image). Greens/violets echo the aurora band.
const BRAND = {
  pageBg: '#f1f1ec',
  bandBg: '#0a0c10',
  bandGradient: 'linear-gradient(135deg, #0a0c10 0%, #11241e 45%, #181130 100%)',
  green: '#5be9b9',
  cardBg: '#ffffff',
  text: '#121212',
  muted: '#6b7280',
  border: '#ececec',
  panelBg: '#f6f7f4',
  // Amber accent for action items (refund / authorities) so they read as
  // something the team must act on, not just another data row.
  accent: '#b5730a',
  accentBg: '#fdf4e3',
  accentBorder: '#f0d8aa',
} as const;

/** True only when a real Resend key is present (not the `re_placeholder` fallback). */
function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key) && key !== 're_placeholder';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function row(label: string, value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(
    label,
  )}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
}

function whenLabel(f: Feedback): string {
  return f.incidentDateTime.toISOString().replace('T', ' ').slice(0, 16);
}

function attachmentsHtml(links: AttachmentLink[]): string {
  if (links.length === 0) return '';
  const items = links
    .map(
      (l) =>
        `<li style="margin:2px 0"><a href="${escapeHtml(l.url)}">${escapeHtml(
          l.name,
        )}</a></li>`,
    )
    .join('');
  return `
    <h3 style="font-family:sans-serif">Evidence (${links.length}) — links expire in 7 days</h3>
    <ul style="font-family:sans-serif;font-size:14px;padding-inline-start:18px;margin:0">${items}</ul>
  `;
}

// Exported for local preview (see scripts/preview-feedback-email.ts). Pure — the
// caller resolves the signed attachment links (IO) before passing them in.
export function businessHtml(f: Feedback, attachmentLinks: AttachmentLink[]): string {
  const requests = actionCallouts(
    [
      f.requestRefund ? 'Refund requested' : null,
      f.notifyAuthorities ? 'Authorities notification requested' : null,
    ].filter((x): x is string => Boolean(x)),
  );
  return `
    <h2 style="font-family:sans-serif">New incident / complaint report</h2>
    ${requests}
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      ${row('Reference', f.reference)}
      ${row('Name', f.name)}
      ${row('Email', f.email)}
      ${row('Phone', f.phone)}
      ${row('Booking reference', f.bookingReference)}
      ${row('Car number', f.carNumber)}
      ${row('Driver name', f.driverName)}
      ${row('Incident location', f.incidentLocation)}
      ${row('Pickup', f.pickupLocation)}
      ${row('Drop-off', f.dropoffLocation)}
      ${row('Incident date/time', whenLabel(f))}
      ${row('Locale', f.locale)}
      ${row('Report ID', f.id)}
    </table>
    <h3 style="font-family:sans-serif">Description</h3>
    <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${nl2br(
      f.description,
    )}</p>
    ${attachmentsHtml(attachmentLinks)}
  `;
}

// Customer-facing copy of what they submitted, with localized field labels.
// Rendered inside the white card, below the message — a quiet receipt.
function customerReportHtml(f: Feedback, locale: Locale): string {
  const { fields, attachmentsLabel, autoReply } = COPY[locale];
  const cellLabel =
    'padding:6px 14px 6px 0;color:#6b7280;font-size:13px;vertical-align:top;white-space:nowrap';
  const cellValue = `padding:6px 0;color:${BRAND.text};font-size:13px`;
  const r = (label: string, value: string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';
    return `<tr><td style="${cellLabel}">${escapeHtml(label)}</td><td style="${cellValue}">${escapeHtml(
      value,
    )}</td></tr>`;
  };
  return `
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid ${BRAND.border}">
      <p style="margin:0 0 12px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted}">${escapeHtml(
        autoReply.copyHeading,
      )}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-family:'DM Sans',Helvetica,Arial,sans-serif;border-collapse:collapse;width:100%">
        ${r(fields.email, f.email)}
        ${r(fields.phone, f.phone)}
        ${r(fields.bookingReference, f.bookingReference)}
        ${r(fields.carNumber, f.carNumber)}
        ${r(fields.driverName, f.driverName)}
        ${r(fields.incidentDateTime, whenLabel(f))}
        ${r(fields.incidentLocation, f.incidentLocation)}
        ${r(fields.pickupLocation, f.pickupLocation)}
        ${r(fields.dropoffLocation, f.dropoffLocation)}
        ${r(attachmentsLabel, f.attachments.length > 0 ? String(f.attachments.length) : '')}
      </table>
      <p style="margin:18px 0 6px;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.muted}">${escapeHtml(
        fields.description,
      )}</p>
      <p style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:${BRAND.text};white-space:pre-wrap">${nl2br(
        f.description,
      )}</p>
    </div>
  `;
}

// Active action items (refund request / notify authorities) as prominent amber
// callout cards — these are the things the team must act on, so they get visual
// weight instead of hiding as plain rows in the data table. Shared by both the
// customer auto-reply and the internal business email. Empty when no labels.
function actionCallouts(labels: string[]): string {
  if (labels.length === 0) return '';
  const cards = labels
    .map(
      (label) => `
      <tr><td style="padding:0 0 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.accentBg};border:1px solid ${BRAND.accentBorder};border-radius:12px">
          <tr>
            <td width="46" align="center" valign="middle" style="font-size:18px;color:${BRAND.accent};padding:14px 0">&#10003;</td>
            <td valign="middle" style="padding:14px 16px 14px 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.text};text-align:left">${escapeHtml(
              label,
            )}</td>
          </tr>
        </table>
      </td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0">${cards}</table>`;
}

// Customer-facing action items, using localized field labels.
function requestsHtml(f: Feedback, locale: Locale): string {
  const { fields } = COPY[locale];
  return actionCallouts(
    [
      f.requestRefund ? fields.requestRefund : null,
      f.notifyAuthorities ? fields.notifyAuthorities : null,
    ].filter((x): x is string => Boolean(x)),
  );
}

// Reference shown as a centered mono "pill" — the one value a passenger may
// need to quote later.
function referencePill(reference: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 0">
      <tr><td style="background:${BRAND.panelBg};border:1px solid ${BRAND.border};border-radius:14px;padding:14px 22px;text-align:center">
        <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.muted}">${escapeHtml(
          label,
        )}</div>
        <div style="margin-top:4px;font-family:'Space Mono',Menlo,Consolas,monospace;font-size:18px;font-weight:700;letter-spacing:0.02em;color:${BRAND.text};direction:ltr;unicode-bidi:isolate">${escapeHtml(
          reference,
        )}</div>
      </td></tr>
    </table>
  `;
}

/**
 * Branded email shell — table-based, inline-styled, Outlook-safe. A dark aurora
 * header band with the wordmark + a ✓ badge, a white content card, and a
 * localized footer. Content (`inner`) is injected into the card.
 */
function emailShell(locale: Locale, inner: string): string {
  const { reassure, help } = COPY[locale];
  const tel = HELP_PHONE.replace(/\s+/g, '');
  return `<!DOCTYPE html>
<html lang="${locale}">
  <body style="margin:0;padding:0;background:${BRAND.pageBg};-webkit-text-size-adjust:100%">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.pageBg}">
      <tr><td align="center" style="padding:28px 12px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%">
          <!-- Header band -->
          <tr><td style="background-color:${BRAND.bandBg};background-image:${BRAND.bandGradient};border-radius:20px 20px 0 0;padding:40px 40px 34px;text-align:center">
            <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-weight:600;font-size:30px;letter-spacing:-0.04em;color:#ffffff">hitch</div>
            <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 0">
              <tr><td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;background:rgba(91,233,185,0.16);border-radius:999px;font-size:26px;line-height:56px;color:${BRAND.green}">&#10003;</td></tr>
            </table>
          </td></tr>
          <!-- Content card -->
          <tr><td style="background:${BRAND.cardBg};padding:40px 40px 8px;text-align:center">${inner}</td></tr>
          <!-- Footer -->
          <tr><td style="background:${BRAND.cardBg};border-radius:0 0 20px 20px;padding:24px 40px 34px;text-align:center;border-top:1px solid ${BRAND.border}">
            <p style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.muted}">${escapeHtml(
              help,
            )} <a href="tel:${escapeHtml(tel)}" style="color:${BRAND.text};text-decoration:none;font-weight:600">${escapeHtml(
              HELP_PHONE,
            )}</a></p>
            <p style="margin:10px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted}">${escapeHtml(
              reassure,
            )}</p>
            <p style="margin:14px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#9ca3af">Hitch &middot; Keflavík &harr; Reykjavík</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

// The Resend SDK resolves with { data, error } instead of throwing on API
// errors, so we must inspect `error` and turn it into a thrown error for the
// allSettled handler below.
async function send(
  label: string,
  payload: Parameters<typeof resend.emails.send>[0],
): Promise<string> {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(`${label}: ${error.name} — ${error.message}`);
  }
  return data?.id ?? 'unknown';
}

async function sendBusinessNotification(f: Feedback): Promise<string> {
  const subject = `[Incident] ${f.name ?? f.email}${
    f.requestRefund ? ' · refund requested' : ''
  }`;
  // Resolve a short-lived signed download URL per evidence key (private bucket).
  const attachmentLinks: AttachmentLink[] = await Promise.all(
    f.attachments.map(async (key, i) => ({
      name: key.split('/').pop() ?? `file-${i + 1}`,
      url: await getDownloadUrl(key, ATTACHMENT_LINK_TTL_SECONDS),
    })),
  );
  return send('business-notification', {
    from: FROM,
    to: BUSINESS_TO,
    replyTo: f.email,
    subject,
    html: businessHtml(f, attachmentLinks),
  });
}

/**
 * Build the customer auto-reply payload (subject + text + branded HTML).
 * Pure — no IO — so it can be previewed/tested without sending.
 */
export function buildCustomerAutoReply(
  f: Feedback,
  locale: Locale,
): { subject: string; text: string; html: string } {
  const { autoReply, referenceLabel } = COPY[locale];

  // Plain-text fallback (clients that don't render HTML).
  const text = f.reference
    ? `${autoReply.body}\n\n${referenceLabel}: ${f.reference}`
    : autoReply.body;

  // Body: first line is the heading (matching the on-screen success state),
  // the rest are paragraphs.
  const [heading, ...rest] = autoReply.body.split('\n').filter(Boolean);
  const headingHtml = `<h1 style="margin:0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.02em;color:${BRAND.text}">${escapeHtml(
    heading ?? '',
  )}</h1>`;
  const paragraphsHtml = rest
    .map(
      (line) =>
        `<p style="margin:14px 0 0;font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.muted}">${escapeHtml(
          line,
        )}</p>`,
    )
    .join('');
  const referenceHtml = f.reference ? referencePill(f.reference, referenceLabel) : '';

  const inner = `${headingHtml}${paragraphsHtml}${referenceHtml}${requestsHtml(
    f,
    locale,
  )}${customerReportHtml(f, locale)}`;

  return { subject: autoReply.subject, text, html: emailShell(locale, inner) };
}

async function sendCustomerAutoReply(f: Feedback, locale: Locale): Promise<string> {
  const { subject, text, html } = buildCustomerAutoReply(f, locale);
  return send('customer-auto-reply', { from: FROM, to: f.email, subject, text, html });
}

export async function notifyFeedback(feedback: Feedback): Promise<void> {
  const locale: Locale = (LOCALES as readonly string[]).includes(feedback.locale ?? '')
    ? (feedback.locale as Locale)
    : 'is';

  if (!isEmailConfigured()) {
    console.warn(
      `[feedback.notify] RESEND_API_KEY not configured — skipping emails for ${
        feedback.reference ?? feedback.id
      }. Set RESEND_API_KEY to enable confirmation + business emails.`,
    );
    return;
  }

  const [business, autoReply] = await Promise.allSettled([
    sendBusinessNotification(feedback),
    sendCustomerAutoReply(feedback, locale),
  ]);

  for (const result of [business, autoReply]) {
    if (result.status === 'rejected') {
      console.error('[feedback.notify] send failed:', result.reason);
    }
  }

  if (business.status === 'fulfilled' && autoReply.status === 'fulfilled') {
    console.log(
      `[feedback.notify] sent for ${feedback.id} — business=${business.value} autoReply=${autoReply.value}`,
    );
  }
}
