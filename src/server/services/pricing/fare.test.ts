import { describe, it, expect } from 'vitest';
import {
  AIRPORT_PARKING_FEE_ISK,
  computeFixedFareISK,
  computeMeterFareISK,
  FIXED_FARES,
  getPaxTier,
  getRateType,
  RATE_CARD,
  roundFareISK,
} from './fare';

// Fixed instants (Iceland is UTC+0, so the UTC wall-clock IS Iceland-local).
const WED_NOON = new Date('2026-06-24T12:00:00Z'); // weekday, day window
const WED_EVENING = new Date('2026-06-24T20:00:00Z'); // weekday, after 17:00
const WED_EARLY = new Date('2026-06-24T06:30:00Z'); // weekday, before 08:00
const SAT_NOON = new Date('2026-06-20T12:00:00Z'); // weekend
const NATIONAL_DAY = new Date('2026-06-17T12:00:00Z'); // holiday (17 June)
const XMAS = new Date('2026-12-25T09:00:00Z'); // holiday

describe('getRateType', () => {
  it('returns day inside the 08:00–17:00 weekday window', () => {
    expect(getRateType(WED_NOON)).toBe('day');
    expect(getRateType(new Date('2026-06-24T08:00:00Z'))).toBe('day');
  });

  it('returns night before 08:00 and from 17:00 on weekdays', () => {
    expect(getRateType(WED_EARLY)).toBe('night');
    expect(getRateType(WED_EVENING)).toBe('night');
    expect(getRateType(new Date('2026-06-24T17:00:00Z'))).toBe('night');
  });

  it('treats weekends as night rate all day', () => {
    expect(getRateType(SAT_NOON)).toBe('night');
    expect(getRateType(new Date('2026-06-21T12:00:00Z'))).toBe('night'); // Sunday
  });

  it('treats listed holidays as holiday rate, overriding the time window', () => {
    expect(getRateType(NATIONAL_DAY)).toBe('holiday');
    expect(getRateType(XMAS)).toBe('holiday');
  });
});

describe('getPaxTier', () => {
  it('maps 1–4 to the small tier and 5–8 to the large tier', () => {
    expect(getPaxTier(1)).toBe('1-4');
    expect(getPaxTier(4)).toBe('1-4');
    expect(getPaxTier(5)).toBe('5-8');
    expect(getPaxTier(8)).toBe('5-8');
  });
});

describe('roundFareISK', () => {
  it('rounds to the nearest 100 ISK (Stripe zero-decimal safety)', () => {
    expect(roundFareISK(5358)).toBe(5400);
    expect(roundFareISK(5349)).toBe(5300);
    expect(roundFareISK(12500)).toBe(12500);
  });
});

describe('computeMeterFareISK', () => {
  it('bills the first 4 km at the high rate and the rest at the low rate (1–4, day)', () => {
    // start 850 + 4*545 + 6*388 = 850 + 2180 + 2328 = 5358 → round100 = 5400
    const fare = computeMeterFareISK({ distanceKm: 10, passengerCount: 1, at: WED_NOON });
    expect(fare.pricingMode).toBe('meter');
    expect(fare.rateType).toBe('day');
    expect(fare.breakdownISK.startFee).toBe(850);
    expect(fare.breakdownISK.distanceFee).toBe(4508);
    expect(fare.breakdownISK.airportFee).toBe(0);
    expect(fare.totalISK).toBe(5400);
  });

  it('charges only the high rate within the first 4 km', () => {
    // start 850 + 3*545 = 2485 → round100 = 2500
    const fare = computeMeterFareISK({ distanceKm: 3, passengerCount: 2, at: WED_NOON });
    expect(fare.breakdownISK.distanceFee).toBe(1635);
    expect(fare.totalISK).toBe(2500);
  });

  it('applies the 5–8 night rate card and waiting time', () => {
    // 5–8 night: start 1050, wait 18660/hr, f4 756
    // start 1050 + 4*756 + 0.5*18660 = 1050 + 3024 + 9330 = 13404 → round100 = 13400
    const fare = computeMeterFareISK({
      distanceKm: 4,
      waitingMinutes: 30,
      passengerCount: 6,
      at: WED_EVENING,
    });
    expect(fare.rateType).toBe('night');
    expect(fare.breakdownISK.startFee).toBe(1050);
    expect(fare.breakdownISK.distanceFee).toBe(3024);
    expect(fare.breakdownISK.waitingFee).toBe(9330);
    expect(fare.totalISK).toBe(13400);
  });

  it('applies the holiday +35% card', () => {
    // 1–4 holiday: start 1150, f4 802 → start 1150 + 4*802 = 1150 + 3208 = 4358 → 4400
    const fare = computeMeterFareISK({ distanceKm: 4, passengerCount: 1, at: XMAS });
    expect(fare.rateType).toBe('holiday');
    expect(fare.breakdownISK.startFee).toBe(1150);
    expect(fare.totalISK).toBe(4400);
  });

  it('adds the KEF gate fee only when includeAirportFee is set', () => {
    const base = computeMeterFareISK({ distanceKm: 2, passengerCount: 1, at: WED_NOON });
    const withFee = computeMeterFareISK({
      distanceKm: 2,
      passengerCount: 1,
      at: WED_NOON,
      includeAirportFee: true,
    });
    expect(withFee.breakdownISK.airportFee).toBe(AIRPORT_PARKING_FEE_ISK);
    expect(withFee.totalISK).toBe(roundFareISK(base.totalISK + AIRPORT_PARKING_FEE_ISK));
  });

  it('charges only the start fee for a zero-distance trip', () => {
    const fare = computeMeterFareISK({ distanceKm: 0, passengerCount: 1, at: WED_NOON });
    expect(fare.breakdownISK.distanceFee).toBe(0);
    expect(fare.totalISK).toBe(roundFareISK(RATE_CARD['1-4'].day.startFeeISK));
  });
});

describe('computeFixedFareISK', () => {
  it('returns the pre-agreed Reykjavík fares by tier', () => {
    expect(computeFixedFareISK('reykjavik', 1).totalISK).toBe(FIXED_FARES.reykjavik['1-4']);
    expect(computeFixedFareISK('reykjavik', 1).totalISK).toBe(22500);
    expect(computeFixedFareISK('reykjavik', 6).totalISK).toBe(29500);
  });

  it('returns the pre-agreed Blue Lagoon fares by tier', () => {
    expect(computeFixedFareISK('blueLagoon', 4).totalISK).toBe(12500);
    expect(computeFixedFareISK('blueLagoon', 8).totalISK).toBe(16500);
  });

  it('reports fixed mode and surfaces the fare in the breakdown', () => {
    const fare = computeFixedFareISK('reykjavik', 2);
    expect(fare.pricingMode).toBe('fixed');
    expect(fare.rateType).toBe('fixed');
    expect(fare.breakdownISK.fixedFare).toBe(22500);
    expect(fare.breakdownISK.startFee).toBe(0);
  });
});
