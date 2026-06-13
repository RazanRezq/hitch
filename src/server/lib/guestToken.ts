import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-SHA256 guest token over a booking id. Lets unauthenticated passengers
 * fetch their own booking (e.g. on the confirmation page poll) without a
 * session. The token is returned once at booking-create time and never stored
 * server-side — verification recomputes the HMAC.
 */
function getSecret(): string {
  // Dedicated secret for guest-booking tokens, independent of the account-auth
  // provider. Falls back to BETTER_AUTH_SECRET so tokens minted before the Clerk
  // migration keep validating during cutover (set GUEST_TOKEN_SECRET to the old
  // BETTER_AUTH_SECRET value to preserve in-flight guest sessions).
  const s = process.env.GUEST_TOKEN_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error('GUEST_TOKEN_SECRET is not set');
  return s;
}

export function signGuestToken(bookingId: string): string {
  return createHmac('sha256', getSecret()).update(bookingId).digest('base64url');
}

export function verifyGuestToken(bookingId: string, token: string): boolean {
  const expected = Buffer.from(signGuestToken(bookingId), 'base64url');
  const provided = Buffer.from(token, 'base64url');
  if (expected.length === 0 || expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}
