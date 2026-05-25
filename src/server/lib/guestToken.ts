import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-SHA256 guest token over a booking id. Lets unauthenticated passengers
 * fetch their own booking (e.g. on the confirmation page poll) without a
 * session. The token is returned once at booking-create time and never stored
 * server-side — verification recomputes the HMAC.
 */
function getSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error('BETTER_AUTH_SECRET is not set');
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
