import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyGuestToken } from './guestToken';

/** Resolve the authenticated user id from a request's session cookie, if any. */
export async function getSessionUserId(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

export type BookingRow = NonNullable<Awaited<ReturnType<typeof prisma.booking.findUnique>>>;
export type AuthResult =
  | { ok: true; booking: BookingRow }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Authorize access to a booking by either an authenticated owner or a valid
 * guest token (HMAC over bookingId). Returns the booking row when authorized,
 * or a 401/403/404 error. Shared by the HTTP route and the WS channel guard.
 */
export async function authorizeBookingAccess(
  bookingId: string,
  sessionUserId: string | null,
  guestToken: string | undefined,
): Promise<AuthResult> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { ok: false, status: 404, error: 'Booking not found' };

  if (sessionUserId && booking.passengerId === sessionUserId) {
    return { ok: true, booking };
  }
  if (guestToken && verifyGuestToken(bookingId, guestToken)) {
    return { ok: true, booking };
  }
  return { ok: false, status: sessionUserId ? 403 : 401, error: 'Forbidden' };
}
