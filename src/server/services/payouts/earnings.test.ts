import { describe, it, expect } from 'vitest';
import { PAYMENT_STATUSES } from '@/lib/types';
import { aggregateEarnings, type EarningsBookingInput } from './earnings';

const DRIVER_A = { id: 'drv_a', name: 'Jón', email: 'jon@hitch.is' };
const DRIVER_B = { id: 'drv_b', name: 'Anna', email: 'anna@hitch.is' };

let seq = 0;
function trip(
  driver: EarningsBookingInput['driver'],
  amountISK: number,
  paymentStatus: string = PAYMENT_STATUSES.SUCCEEDED,
): EarningsBookingInput {
  seq += 1;
  return {
    id: `bk_${seq}`,
    code: `HTCH-000${seq}`,
    scheduledTime: new Date(`2026-07-${String(seq).padStart(2, '0')}T10:00:00Z`),
    pickupAddress: 'KEF',
    dropoffAddress: 'Reykjavík',
    driver,
    payments: [{ status: paymentStatus, amountISK, createdAt: new Date('2026-07-01T00:00:00Z') }],
  };
}

describe('aggregateEarnings', () => {
  it('groups captured trips per driver with real ISK sums and grand totals', () => {
    const report = aggregateEarnings([
      trip(DRIVER_A, 13900),
      trip(DRIVER_A, 42090),
      trip(DRIVER_B, 25900),
    ]);

    expect(report.drivers).toHaveLength(2);
    const [first, second] = report.drivers;
    // Sorted by gross descending: Jón (55,990) before Anna (25,900)
    expect(first!.driverId).toBe('drv_a');
    expect(first!.tripCount).toBe(2);
    expect(first!.grossISK).toBe(55990);
    expect(first!.trips).toHaveLength(2);
    expect(second!.driverId).toBe('drv_b');
    expect(second!.grossISK).toBe(25900);
    expect(report.totals).toEqual({ tripCount: 3, grossISK: 81890 });
    expect(report.excluded).toEqual({ refunded: 0, unpaid: 0, unassigned: 0 });
  });

  it('excludes refunded and partially-refunded trips from the sums but counts them', () => {
    const report = aggregateEarnings([
      trip(DRIVER_A, 13900),
      trip(DRIVER_A, 42090, PAYMENT_STATUSES.REFUNDED),
      trip(DRIVER_A, 25900, PAYMENT_STATUSES.PARTIALLY_REFUNDED),
    ]);

    expect(report.drivers[0]!.grossISK).toBe(13900);
    expect(report.drivers[0]!.tripCount).toBe(1);
    expect(report.excluded.refunded).toBe(2);
  });

  it('excludes unpaid (no SUCCEEDED payment) and driverless completions', () => {
    const noPayment: EarningsBookingInput = { ...trip(DRIVER_A, 0), payments: [] };
    const report = aggregateEarnings([
      noPayment,
      trip(DRIVER_A, 13900, PAYMENT_STATUSES.CANCELED),
      trip(null, 13900),
    ]);

    expect(report.drivers).toHaveLength(0);
    expect(report.totals.grossISK).toBe(0);
    expect(report.excluded).toEqual({ refunded: 0, unpaid: 2, unassigned: 1 });
  });

  it('uses the LATEST payment when a booking has several', () => {
    const b = trip(DRIVER_A, 13900);
    b.payments = [
      // older, abandoned intent
      { status: PAYMENT_STATUSES.CANCELED, amountISK: 99999, createdAt: new Date('2026-07-01T00:00:00Z') },
      { status: PAYMENT_STATUSES.SUCCEEDED, amountISK: 13900, createdAt: new Date('2026-07-02T00:00:00Z') },
    ];
    const report = aggregateEarnings([b]);
    expect(report.drivers[0]!.grossISK).toBe(13900);
  });

  it('returns an empty report for no bookings', () => {
    const report = aggregateEarnings([]);
    expect(report.drivers).toEqual([]);
    expect(report.totals).toEqual({ tripCount: 0, grossISK: 0 });
  });
});
