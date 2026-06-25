import { describe, it, expect } from 'vitest';
import {
  computeFixedFareISK,
  computeMeterFareISK,
  getPaxTier,
  getRateType,
  ManualQuoteRequiredError,
  roundFareISK,
} from './fare';
import { AIRPORT_FEE_ISK, FIXED_FARES, RATE_CARD } from './config';

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
  it('maps passenger counts to 1-4 / 5-8 / 9-16', () => {
    expect(getPaxTier(1)).toBe('1-4');
    expect(getPaxTier(4)).toBe('1-4');
    expect(getPaxTier(5)).toBe('5-8');
    expect(getPaxTier(8)).toBe('5-8');
    expect(getPaxTier(9)).toBe('9-16');
    expect(getPaxTier(16)).toBe('9-16');
  });
});

describe('roundFareISK', () => {
  it('rounds metered totals to the nearest 50 ISK (the meter ticks every 50)', () => {
    expect(roundFareISK(5358)).toBe(5350);
    expect(roundFareISK(5375)).toBe(5400);
    expect(roundFareISK(12500)).toBe(12500);
  });
});

describe('computeMeterFareISK', () => {
  it('bills the first 4 km high and the rest low, rounded to 50 (1–4, day)', () => {
    // 850 + 4*545 + 6*388 = 5358 → round50 = 5350
    const fare = computeMeterFareISK({ distanceKm: 10, passengerCount: 1, at: WED_NOON });
    expect(fare.pricingMode).toBe('meter');
    expect(fare.rateType).toBe('day');
    expect(fare.breakdownISK.startFee).toBe(850);
    expect(fare.breakdownISK.distanceFee).toBe(4508);
    expect(fare.totalISK).toBe(5350);
  });

  it('charges only the high rate within the first 4 km', () => {
    // 1050 + 3*709 = 3177 → round50 = 3200 (5–8 day)
    const fare = computeMeterFareISK({ distanceKm: 3, passengerCount: 6, at: WED_NOON });
    expect(fare.breakdownISK.distanceFee).toBe(2127);
    expect(fare.totalISK).toBe(3200);
  });

  it('applies the 5–8 night rate card and waiting time', () => {
    // 1050 + 4*756 + 0.5*18660 = 13404 → round50 = 13400
    const fare = computeMeterFareISK({
      distanceKm: 4,
      waitingMinutes: 30,
      passengerCount: 6,
      at: WED_EVENING,
    });
    expect(fare.rateType).toBe('night');
    expect(fare.breakdownISK.waitingFee).toBe(9330);
    expect(fare.totalISK).toBe(13400);
  });

  it('applies the holiday +35% card', () => {
    // 1150 + 4*802 = 4358 → round50 = 4350
    const fare = computeMeterFareISK({ distanceKm: 4, passengerCount: 1, at: XMAS });
    expect(fare.rateType).toBe('holiday');
    expect(fare.totalISK).toBe(4350);
  });

  it('adds the 490 ISK gate fee only when includeAirportFee is set', () => {
    // base: 850 + 2*545 = 1940 → 1950; with fee: 1940 + 490 = 2430 → 2450
    const base = computeMeterFareISK({ distanceKm: 2, passengerCount: 1, at: WED_NOON });
    const withFee = computeMeterFareISK({
      distanceKm: 2,
      passengerCount: 1,
      at: WED_NOON,
      includeAirportFee: true,
    });
    expect(base.totalISK).toBe(1950);
    expect(withFee.breakdownISK.airportFee).toBe(AIRPORT_FEE_ISK);
    expect(withFee.breakdownISK.airportFee).toBe(490);
    expect(withFee.totalISK).toBe(2450);
  });

  it('folds an off-list surcharge into the total', () => {
    // 850 + 4*545 = 3030 + surcharge 18750 = 21780 → round50 = 21800
    const fare = computeMeterFareISK({
      distanceKm: 4,
      passengerCount: 1,
      at: WED_NOON,
      surchargeISK: 18750,
    });
    expect(fare.totalISK).toBe(21800);
  });

  it('charges only the start fee for a zero-distance trip', () => {
    const fare = computeMeterFareISK({ distanceKm: 0, passengerCount: 1, at: WED_NOON });
    expect(fare.breakdownISK.distanceFee).toBe(0);
    expect(fare.totalISK).toBe(roundFareISK(RATE_CARD['1-4'].day.startFeeISK));
  });

  it('refuses to meter a 9–16 passenger trip (manual quote required)', () => {
    expect(() => computeMeterFareISK({ distanceKm: 10, passengerCount: 12, at: WED_NOON })).toThrow(
      ManualQuoteRequiredError,
    );
  });
});

describe('computeFixedFareISK', () => {
  it('returns the corrected per-tier Reykjavík ISK fares', () => {
    expect(computeFixedFareISK('reykjavik', 1).totalISK).toBe(22500);
    expect(computeFixedFareISK('reykjavik', 6).totalISK).toBe(29250); // corrected from 29500
    expect(computeFixedFareISK('reykjavik', 12).totalISK).toBe(58500); // 9-16 tier
  });

  it('returns the Blue Lagoon ISK fares incl. the 9-16 tier', () => {
    expect(computeFixedFareISK('blueLagoon', 4).totalISK).toBe(12500);
    expect(computeFixedFareISK('blueLagoon', 8).totalISK).toBe(16500);
    expect(computeFixedFareISK('blueLagoon', 16).totalISK).toBe(33000);
  });

  it('exposes explicit per-currency prices (no auto-conversion)', () => {
    const rvk = computeFixedFareISK('reykjavik', 1);
    expect(rvk.fixedPricesMajor).toEqual({ ISK: 22500, EUR: 150, USD: 170 });
    expect(rvk.fixedPricesMajor).toEqual(FIXED_FARES.reykjavik['1-4']);

    const bl = computeFixedFareISK('blueLagoon', 6);
    expect(bl.fixedPricesMajor).toEqual({ ISK: 16500, EUR: 110, USD: 130 });
  });

  it('reports fixed mode and surfaces the fare in the breakdown', () => {
    const fare = computeFixedFareISK('reykjavik', 2);
    expect(fare.pricingMode).toBe('fixed');
    expect(fare.rateType).toBe('fixed');
    expect(fare.breakdownISK.fixedFare).toBe(22500);
    expect(fare.breakdownISK.startFee).toBe(0);
  });

  it('stacks the 490 gate fee on a fixed fare originating at KEF, keeping prices transfer-only', () => {
    const withFee = computeFixedFareISK('reykjavik', 1, { includeAirportFee: true });
    expect(withFee.totalISK).toBe(22990); // 22500 + 490
    expect(withFee.breakdownISK.airportFee).toBe(490);
    expect(withFee.breakdownISK.fixedFare).toBe(22500);
    expect(withFee.fixedPricesMajor).toEqual({ ISK: 22500, EUR: 150, USD: 170 }); // unchanged

    const noFee = computeFixedFareISK('reykjavik', 1, { includeAirportFee: false });
    expect(noFee.totalISK).toBe(22500);
    expect(noFee.breakdownISK.airportFee).toBe(0);
  });
});
