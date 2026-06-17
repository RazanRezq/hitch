import { describe, it, expect } from 'vitest';
import { BOOKING_STATUSES, type BookingStatus } from '@/lib/types';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  assertTransition,
  InvalidTransitionError,
} from './state-machine';

const S = BOOKING_STATUSES;

/** The happy-path lifecycle, end to end. Every step must be a legal transition. */
const HAPPY_PATH: [BookingStatus, BookingStatus][] = [
  [S.DRAFT, S.PENDING_PAYMENT],
  [S.PENDING_PAYMENT, S.CONFIRMED],
  [S.CONFIRMED, S.SEARCHING],
  [S.SEARCHING, S.ACCEPTED],
  [S.ACCEPTED, S.DRIVER_ARRIVING],
  [S.DRIVER_ARRIVING, S.DRIVER_ARRIVED],
  [S.DRIVER_ARRIVED, S.IN_TRANSIT],
  [S.IN_TRANSIT, S.COMPLETED],
];

/** States with no legal exit (the booking is done forever). */
const DEAD_END_STATES: BookingStatus[] = [
  S.CANCELLED_BY_PASSENGER,
  S.CANCELLED_BY_DRIVER,
  S.CANCELLED_BY_SYSTEM,
  S.NO_SHOW,
  S.DISPUTED,
];

describe('booking state machine', () => {
  it('allows every step of the happy-path lifecycle', () => {
    for (const [from, to] of HAPPY_PATH) {
      expect(canTransition(from, to), `${from} → ${to}`).toBe(true);
    }
  });

  it('rejects representative illegal transitions', () => {
    expect(canTransition(S.COMPLETED, S.SEARCHING)).toBe(false);
    expect(canTransition(S.DRAFT, S.COMPLETED)).toBe(false);
    expect(canTransition(S.PENDING_PAYMENT, S.ACCEPTED)).toBe(false);
    expect(canTransition(S.IN_TRANSIT, S.DRAFT)).toBe(false);
    expect(canTransition(S.NO_SHOW, S.IN_TRANSIT)).toBe(false);
  });

  it('treats dead-end states as terminal (no outgoing transitions)', () => {
    for (const state of DEAD_END_STATES) {
      expect(ALLOWED_TRANSITIONS[state], state).toEqual([]);
    }
  });

  it('still allows COMPLETED → DISPUTED (post-trip dispute window)', () => {
    expect(canTransition(S.COMPLETED, S.DISPUTED)).toBe(true);
  });

  it('defines transitions for every known booking status', () => {
    for (const status of Object.values(S)) {
      expect(ALLOWED_TRANSITIONS[status], status).toBeDefined();
    }
  });

  it('only ever transitions to known statuses', () => {
    const known = new Set<string>(Object.values(S));
    for (const [, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const target of targets) expect(known.has(target)).toBe(true);
    }
  });

  describe('assertTransition', () => {
    it('does not throw on a legal transition', () => {
      expect(() => assertTransition(S.IN_TRANSIT, S.COMPLETED)).not.toThrow();
    });

    it('throws InvalidTransitionError on an illegal transition', () => {
      expect(() => assertTransition(S.COMPLETED, S.SEARCHING)).toThrow(
        InvalidTransitionError,
      );
    });
  });
});
