import { prisma } from '@/lib/db';
import { BOOKING_STATUSES } from '@/lib/types';
import { canTransition } from '@/server/services/booking/state-machine';
import { publishBookingUpdate } from '@/server/realtime/publish-booking';
import { publishDispatchEvent } from '@/server/realtime/publish-dispatch';

/**
 * Dispatch a CONFIRMED booking: advance it to SEARCHING and surface it on the
 * dispatcher queue (dispatch:global). Phase 1 is MANUAL dispatch — a dispatcher
 * then assigns a driver; the auto offer/accept loop (scoring, offering to
 * driver:{id}:jobs, timeout, escalation) lands with the Phase 2 driver app.
 *
 * Runs only from the BullMQ dispatch worker — never inline (CLAUDE.md "DISPATCH
 * LOGIC"). Idempotent: no-ops if the booking already advanced or was cancelled.
 */
export async function dispatchBooking(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  if (booking.status !== BOOKING_STATUSES.CONFIRMED) return;
  if (!canTransition(booking.status, BOOKING_STATUSES.SEARCHING)) return;

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: BOOKING_STATUSES.SEARCHING },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId,
        type: 'STATUS_CHANGED',
        payload: { from: BOOKING_STATUSES.CONFIRMED, to: BOOKING_STATUSES.SEARCHING, reason: 'dispatch' },
      },
    }),
    prisma.bookingEvent.create({
      data: { bookingId, type: 'DISPATCH_OFFERED', payload: { mode: 'manual' } },
    }),
  ]);

  publishBookingUpdate(bookingId, BOOKING_STATUSES.SEARCHING);
  publishDispatchEvent({ type: 'dispatch', action: 'enqueue', bookingId });
}
