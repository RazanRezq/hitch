import { resend } from '@/server/lib/resend';
import type { Locale } from '@/lib/types';

/**
 * Shared transactional-email chrome: brand palette, the Outlook-safe branded
 * shell (dark aurora header band + white card + footer), and small helpers.
 * Used by the feedback auto-reply and the booking confirmation email so the
 * two can never drift apart visually.
 */

// Email-safe brand palette. Inline hex only — email clients don't understand
// our OKLCH design tokens, and gradients degrade to the solid `bandBg` in
// Outlook (which ignores background-image). Greens/violets echo the aurora band.
export const BRAND = {
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
export function isEmailConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return Boolean(key) && key !== 're_placeholder';
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function nl2br(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

// Reference shown as a centered mono "pill" — the one value a passenger may
// need to quote later.
export function referencePill(reference: string, label: string): string {
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

interface ShellOptions {
  locale: Locale;
  /** Card content, injected as-is (caller escapes its own values). */
  inner: string;
  /** Footer help line, e.g. "Need help right now? Call". */
  help: string;
  /** Display phone for the footer help line. */
  phone: string;
  /** Footer reassurance line under the help line. */
  reassure: string;
}

/**
 * Branded email shell — table-based, inline-styled, Outlook-safe. A dark aurora
 * header band with the wordmark + a ✓ badge, a white content card, and a
 * localized footer. Content (`inner`) is injected into the card.
 */
export function emailShell({ locale, inner, help, phone, reassure }: ShellOptions): string {
  const tel = phone.replace(/\s+/g, '');
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
              phone,
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
// caller's settled/catch handling.
export async function send(
  label: string,
  payload: Parameters<typeof resend.emails.send>[0],
): Promise<string> {
  const { data, error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(`${label}: ${error.name} — ${error.message}`);
  }
  return data?.id ?? 'unknown';
}
