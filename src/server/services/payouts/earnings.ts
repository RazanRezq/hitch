import { PAYMENT_STATUSES } from '@/lib/types';

/**
 * Interim driver-earnings aggregation — the pilot's manual-payout basis while
 * the real payout mechanism (Stripe Connect vs payroll) is a pending client
 * decision. Read-only: produces no DriverPayout rows; the payout worker stays
 * a stub until that decision lands.
 *
 * Basis (documented in the admin UI footnote):
 * - COMPLETED bookings with an assigned driver, windowed by `scheduledTime`
 *   (always present and indexed via `[status, scheduledTime]`; completion
 *   timestamps are path-dependent — only the driver app stamps
 *   `actualDropoffAt` — so trip date is the honest payroll period key).
 * - Amount = the captured payment's `amountISK` (ISK is the accounting truth),
 *   GROSS — the commission split is applied manually until the client fixes it.
 * - Only fully-captured, un-refunded payments (SUCCEEDED) count. Refunded /
 *   partially-refunded, unpaid (e.g. cash), and driverless completions are
 *   excluded from the sums but counted so the operator can investigate.
 */

interface EarningsPayment {
  status: string;
  amountISK: number;
  createdAt: Date;
}

export interface EarningsBookingInput {
  id: string;
  code: string | null;
  scheduledTime: Date;
  pickupAddress: string;
  dropoffAddress: string;
  driver: { id: string; name: string | null; email: string } | null;
  /** All payments for the booking; the aggregation picks the latest. */
  payments: EarningsPayment[];
}

export interface EarningsTrip {
  id: string;
  code: string | null;
  scheduledTime: Date;
  pickupAddress: string;
  dropoffAddress: string;
  amountISK: number;
}

export interface DriverEarnings {
  driverId: string;
  driverName: string | null;
  driverEmail: string;
  tripCount: number;
  grossISK: number;
  trips: EarningsTrip[];
}

export interface EarningsReport {
  /** Sorted by grossISK descending, then name for stable ties. */
  drivers: DriverEarnings[];
  totals: { tripCount: number; grossISK: number };
  /** Completed trips left out of the sums, by reason. */
  excluded: { refunded: number; unpaid: number; unassigned: number };
}

const REFUND_STATUSES: readonly string[] = [
  PAYMENT_STATUSES.REFUNDED,
  PAYMENT_STATUSES.PARTIALLY_REFUNDED,
];

function latestPayment(payments: EarningsPayment[]): EarningsPayment | undefined {
  return [...payments].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

export function aggregateEarnings(bookings: EarningsBookingInput[]): EarningsReport {
  const byDriver = new Map<string, DriverEarnings>();
  const excluded = { refunded: 0, unpaid: 0, unassigned: 0 };

  for (const b of bookings) {
    if (!b.driver) {
      excluded.unassigned += 1;
      continue;
    }
    const payment = latestPayment(b.payments);
    if (payment && REFUND_STATUSES.includes(payment.status)) {
      excluded.refunded += 1;
      continue;
    }
    if (!payment || payment.status !== PAYMENT_STATUSES.SUCCEEDED) {
      excluded.unpaid += 1;
      continue;
    }

    let entry = byDriver.get(b.driver.id);
    if (!entry) {
      entry = {
        driverId: b.driver.id,
        driverName: b.driver.name,
        driverEmail: b.driver.email,
        tripCount: 0,
        grossISK: 0,
        trips: [],
      };
      byDriver.set(b.driver.id, entry);
    }
    entry.tripCount += 1;
    entry.grossISK += payment.amountISK;
    entry.trips.push({
      id: b.id,
      code: b.code,
      scheduledTime: b.scheduledTime,
      pickupAddress: b.pickupAddress,
      dropoffAddress: b.dropoffAddress,
      amountISK: payment.amountISK,
    });
  }

  const drivers = [...byDriver.values()].sort(
    (a, b) => b.grossISK - a.grossISK || (a.driverName ?? '').localeCompare(b.driverName ?? ''),
  );

  return {
    drivers,
    totals: {
      tripCount: drivers.reduce((n, d) => n + d.tripCount, 0),
      grossISK: drivers.reduce((n, d) => n + d.grossISK, 0),
    },
    excluded,
  };
}
