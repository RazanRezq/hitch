import { USER_ROLES, type UserRole } from '@/lib/types';
import { prisma } from '@/lib/db';
import { getSessionUserId, authorizeBookingAccess } from '@/server/lib/booking-access';

export interface WsAuth {
  userId: string | null;
  role: UserRole | null;
}

/** Resolve a connection's identity once from its handshake cookies. */
export async function loadWsAuth(headers: Headers): Promise<WsAuth> {
  const userId = await getSessionUserId(headers);
  if (!userId) return { userId: null, role: null };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return { userId, role: user?.role ?? null };
}

const isStaff = (role: UserRole | null) =>
  role === USER_ROLES.DISPATCHER || role === USER_ROLES.SUPER_ADMIN;

/**
 * RBAC for WS channel subscription. Mirrors the channel table in CLAUDE.md
 * "REALTIME ARCHITECTURE". `token` is the optional per-channel guest token
 * (HMAC over the booking id) used by unauthenticated passengers.
 *
 * Default-deny: unknown channels and the server-only `system` channel are refused.
 */
export async function authorizeChannel(
  channel: string,
  auth: WsAuth,
  token?: string,
): Promise<boolean> {
  // booking:{id} — passenger (session or guest token), assigned driver, or staff.
  if (channel.startsWith('booking:')) {
    const bookingId = channel.slice('booking:'.length);
    if (!bookingId) return false;
    if (isStaff(auth.role)) return true;
    const res = await authorizeBookingAccess(bookingId, auth.userId, token);
    if (res.ok) return true;
    if (auth.role === USER_ROLES.DRIVER && auth.userId) {
      const b = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { driverId: true },
      });
      if (b?.driverId === auth.userId) return true;
    }
    return false;
  }

  // dispatch:global / driver-locations — staff only.
  if (channel === 'dispatch:global' || channel === 'driver-locations') {
    return isStaff(auth.role);
  }

  // driver:{driverId}:jobs — that driver only.
  const driverJobs = /^driver:(.+):jobs$/.exec(channel);
  if (driverJobs) {
    return auth.role === USER_ROLES.DRIVER && auth.userId === driverJobs[1];
  }

  // user:{userId}:notifications — that user only.
  const userNotif = /^user:(.+):notifications$/.exec(channel);
  if (userNotif) {
    return !!auth.userId && auth.userId === userNotif[1];
  }

  return false;
}
