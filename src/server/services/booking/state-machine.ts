import { BOOKING_STATUSES, type BookingStatus } from '@/lib/types';

/**
 * Authoritative booking state machine. Every status transition in the system —
 * the webhook worker, dispatcher actions, dispatch worker — validates against
 * this map so illegal transitions are rejected and logged. Mirrors the lifecycle
 * in CLAUDE.md "State Machine" and HITCH_MASTER_PLAN.md §10.
 *
 * Note: individual routes MAY layer stricter *policy* on top (e.g. the passenger
 * cancel endpoint only allows cancelling while PENDING_PAYMENT). This map defines
 * what is *legal*, not what every actor is *permitted* to do.
 */
const S = BOOKING_STATUSES;

export const ALLOWED_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  [S.DRAFT]: [S.PENDING_PAYMENT, S.CANCELLED_BY_SYSTEM],
  [S.PENDING_PAYMENT]: [S.CONFIRMED, S.CANCELLED_BY_PASSENGER, S.CANCELLED_BY_SYSTEM],
  [S.CONFIRMED]: [S.SEARCHING, S.ACCEPTED, S.CANCELLED_BY_PASSENGER, S.CANCELLED_BY_SYSTEM, S.DISPUTED],
  [S.SEARCHING]: [S.ACCEPTED, S.CANCELLED_BY_SYSTEM, S.CANCELLED_BY_PASSENGER, S.DISPUTED],
  [S.ACCEPTED]: [
    S.DRIVER_ARRIVING,
    S.CANCELLED_BY_DRIVER,
    S.CANCELLED_BY_PASSENGER,
    S.CANCELLED_BY_SYSTEM,
    S.DISPUTED,
  ],
  [S.DRIVER_ARRIVING]: [
    S.DRIVER_ARRIVED,
    S.CANCELLED_BY_DRIVER,
    S.CANCELLED_BY_PASSENGER,
    S.CANCELLED_BY_SYSTEM,
  ],
  [S.DRIVER_ARRIVED]: [S.IN_TRANSIT, S.NO_SHOW, S.CANCELLED_BY_DRIVER, S.CANCELLED_BY_PASSENGER],
  [S.IN_TRANSIT]: [S.COMPLETED, S.DISPUTED],
  [S.COMPLETED]: [S.DISPUTED],
  // Terminal states — no transitions out.
  [S.CANCELLED_BY_PASSENGER]: [],
  [S.CANCELLED_BY_DRIVER]: [],
  [S.CANCELLED_BY_SYSTEM]: [],
  [S.NO_SHOW]: [],
  [S.DISPUTED]: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(`Illegal booking transition: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

/** Throws InvalidTransitionError when from→to is not an allowed transition. */
export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
