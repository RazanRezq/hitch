import isMessages from '@/../messages/is.json';
import enMessages from '@/../messages/en.json';
import { resend } from '@/server/lib/resend';
import { LOCALES, type Locale } from '@/lib/types';
import type { Feedback } from '@/lib/db';

/**
 * Dual email dispatch for an incident report. Both sends are best-effort:
 * failures are caught and logged here so the caller's request never fails on
 * email problems (the DB row is already saved by the time we're called).
 */

const FROM = process.env.FEEDBACK_NOTIFY_FROM ?? 'Hitch <noreply@hitch.is>';
const BUSINESS_TO = process.env.FEEDBACK_NOTIFY_TO ?? 'business@hitch.is';

// Auto-reply copy is sourced from the SAME message files the UI uses, so the
// email and the on-screen success state can never drift apart.
const AUTO_REPLY: Record<Locale, { subject: string; body: string }> = {
  is: isMessages.feedback.autoReply,
  en: enMessages.feedback.autoReply,
};

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

function businessHtml(f: Feedback): string {
  const when = f.incidentDateTime.toISOString().replace('T', ' ').slice(0, 16);
  return `
    <h2 style="font-family:sans-serif">New incident / complaint report</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
      ${row('Name', f.name)}
      ${row('Email', f.email)}
      ${row('Phone', f.phone)}
      ${row('Car number', f.carNumber)}
      ${row('Driver name', f.driverName)}
      ${row('Incident location', f.incidentLocation)}
      ${row('Pickup', f.pickupLocation)}
      ${row('Drop-off', f.dropoffLocation)}
      ${row('Incident date/time', when)}
      ${row('Request refund', f.requestRefund)}
      ${row('Notify authorities', f.notifyAuthorities)}
      ${row('Locale', f.locale)}
      ${row('Report ID', f.id)}
    </table>
    <h3 style="font-family:sans-serif">Description</h3>
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
  return send('business-notification', {
    from: FROM,
    to: BUSINESS_TO,
    replyTo: f.email,
    subject,
    html: businessHtml(f),
  });
}

async function sendCustomerAutoReply(f: Feedback, locale: Locale): Promise<string> {
  const copy = AUTO_REPLY[locale];
  return send('customer-auto-reply', {
    from: FROM,
    to: f.email,
    subject: copy.subject,
    text: copy.body,
    html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.6">${nl2br(
      copy.body,
    )}</div>`,
  });
}

export async function notifyFeedback(feedback: Feedback): Promise<void> {
  const locale: Locale = (LOCALES as readonly string[]).includes(feedback.locale ?? '')
    ? (feedback.locale as Locale)
    : 'is';

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
