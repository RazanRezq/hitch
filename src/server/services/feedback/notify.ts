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
  }
> = {
  is: {
    autoReply: isMessages.feedback.autoReply,
    fields: isMessages.feedback.fields,
    referenceLabel: isMessages.feedback.referenceLabel,
    attachmentsLabel: isMessages.feedback.attachmentsLabel,
  },
  en: {
    autoReply: enMessages.feedback.autoReply,
    fields: enMessages.feedback.fields,
    referenceLabel: enMessages.feedback.referenceLabel,
    attachmentsLabel: enMessages.feedback.attachmentsLabel,
  },
};

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

function row(label: string, value: string | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
  return `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${escapeHtml(
    label,
  )}</td><td style="padding:4px 0">${escapeHtml(String(display))}</td></tr>`;
}

// A boolean flag rendered only when true, as a localized statement (avoids
// emitting an English "Yes"/"No" inside a localized customer email).
function flagRow(label: string, value: boolean): string {
  if (!value) return '';
  return `<tr><td colspan="2" style="padding:4px 0;color:#111">✓ ${escapeHtml(label)}</td></tr>`;
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

function businessHtml(f: Feedback, attachmentLinks: AttachmentLink[]): string {
  return `
    <h2 style="font-family:sans-serif">New incident / complaint report</h2>
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
      ${row('Request refund', f.requestRefund)}
      ${row('Notify authorities', f.notifyAuthorities)}
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
function customerReportHtml(f: Feedback, locale: Locale): string {
  const { fields, referenceLabel, attachmentsLabel, autoReply } = COPY[locale];
  return `
    <h3 style="font-family:sans-serif;font-size:15px;margin:24px 0 8px">${escapeHtml(
      autoReply.copyHeading,
    )}</h3>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      ${row(referenceLabel, f.reference)}
      ${row(fields.email, f.email)}
      ${row(fields.phone, f.phone)}
      ${row(fields.bookingReference, f.bookingReference)}
      ${row(fields.carNumber, f.carNumber)}
      ${row(fields.driverName, f.driverName)}
      ${row(fields.incidentDateTime, whenLabel(f))}
      ${row(fields.incidentLocation, f.incidentLocation)}
      ${row(fields.pickupLocation, f.pickupLocation)}
      ${row(fields.dropoffLocation, f.dropoffLocation)}
      ${flagRow(fields.requestRefund, f.requestRefund)}
      ${flagRow(fields.notifyAuthorities, f.notifyAuthorities)}
      ${row(attachmentsLabel, f.attachments.length > 0 ? String(f.attachments.length) : '')}
    </table>
    <h3 style="font-family:sans-serif;font-size:15px;margin:16px 0 8px">${escapeHtml(
      fields.description,
    )}</h3>
    <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${nl2br(
      f.description,
    )}</p>
  `;
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

async function sendCustomerAutoReply(f: Feedback, locale: Locale): Promise<string> {
  const { autoReply, referenceLabel } = COPY[locale];
  const text = f.reference
    ? `${autoReply.body}\n\n${referenceLabel}: ${f.reference}`
    : autoReply.body;
  const referenceHtml = f.reference
    ? `<p style="font-family:sans-serif;font-size:15px;margin:16px 0 0">${escapeHtml(
        referenceLabel,
      )}: <strong style="font-family:monospace">${escapeHtml(f.reference)}</strong></p>`
    : '';
  return send('customer-auto-reply', {
    from: FROM,
    to: f.email,
    subject: autoReply.subject,
    text,
    html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6">${nl2br(
      autoReply.body,
    )}${referenceHtml}${customerReportHtml(f, locale)}</div>`,
  });
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
