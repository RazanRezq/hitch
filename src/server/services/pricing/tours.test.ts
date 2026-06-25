import { describe, it, expect } from 'vitest';
import {
  computeTourFareISK,
  getTourQuote,
  listTours,
  ManualQuoteRequiredError,
} from './index';
import { TOUR_EUR_TO_ISK, TOUR_FARES_EUR } from './config';

describe('computeTourFareISK — EUR-native list price × 150', () => {
  it('prices the 1–4 car from the EUR catalog', () => {
    // Golden Circle 1–4 = €720 → 108 000 ISK
    const fare = computeTourFareISK('golden-circle', 2);
    expect(fare.paxTier).toBe('1-4');
    expect(fare.totalISK).toBe(720 * TOUR_EUR_TO_ISK);
    expect(fare.totalISK).toBe(108000);
  });

  it('prices the 5–8 car from the EUR catalog', () => {
    // Golden Circle 5–8 = €930 → 139 500 ISK
    expect(computeTourFareISK('golden-circle', 6).totalISK).toBe(139500);
    // South Coast 5–8 = €1 360 → 204 000 ISK
    expect(computeTourFareISK('south-coast', 8).totalISK).toBe(204000);
  });

  it('covers every catalog tour and tier with EUR × 150', () => {
    for (const [tourId, tiers] of Object.entries(TOUR_FARES_EUR)) {
      expect(computeTourFareISK(tourId as keyof typeof TOUR_FARES_EUR, 1).totalISK).toBe(
        tiers['1-4'] * 150,
      );
      expect(computeTourFareISK(tourId as keyof typeof TOUR_FARES_EUR, 5).totalISK).toBe(
        tiers['5-8'] * 150,
      );
    }
  });

  it('refuses a 9–16 group (no tour list price → manual quote)', () => {
    expect(() => computeTourFareISK('golden-circle', 12)).toThrow(ManualQuoteRequiredError);
    try {
      computeTourFareISK('golden-circle', 12);
    } catch (err) {
      expect((err as ManualQuoteRequiredError).code).toBe('TOUR_TIER_UNSUPPORTED');
    }
  });
});

describe('getTourQuote — fixed display FX (EUR reproduces the list price exactly)', () => {
  it('quotes ISK 1:1', () => {
    const q = getTourQuote({ tourId: 'golden-circle', passengerCount: 2, displayCurrency: 'ISK' });
    expect(q.basePriceISK).toBe(108000);
    expect(q.displayPrice).toBe(108000);
    expect(q.exchangeRate).toBe(1);
  });

  it('reproduces the exact EUR list price (108 000 / 150 = €720,00)', () => {
    const q = getTourQuote({ tourId: 'golden-circle', passengerCount: 2, displayCurrency: 'EUR' });
    expect(q.displayPrice).toBe(72000); // €720.00 in cents
    expect(q.exchangeRate).toBeCloseTo(1 / 150, 8);
  });

  it('derives USD from ISK at /130 (108 000 / 130 = $830,77)', () => {
    const q = getTourQuote({ tourId: 'golden-circle', passengerCount: 2, displayCurrency: 'USD' });
    expect(q.displayPrice).toBe(Math.round((108000 / 130) * 100)); // 83077 cents
    expect(q.displayPrice).toBe(83077);
  });

  it('defaults to 1 passenger and ISK', () => {
    const q = getTourQuote({ tourId: 'city-center' });
    expect(q.paxTier).toBe('1-4');
    expect(q.basePriceISK).toBe(30 * 150); // €30 → 4 500 ISK
    expect(q.displayCurrency).toBe('ISK');
  });

  it('propagates the manual-quote error for 9–16', () => {
    expect(() => getTourQuote({ tourId: 'snaefellsnes', passengerCount: 10 })).toThrow(
      ManualQuoteRequiredError,
    );
  });
});

describe('listTours — display-ready catalog', () => {
  it('lists every configured tour once', () => {
    const tours = listTours();
    expect(tours).toHaveLength(Object.keys(TOUR_FARES_EUR).length);
    expect(tours.map((t) => t.tourId)).toEqual(Object.keys(TOUR_FARES_EUR));
  });

  it('exposes per-tier prices in every currency, rounded for display', () => {
    const golden = listTours().find((t) => t.tourId === 'golden-circle')!;
    expect(golden.pricesByTier['1-4']).toEqual({ ISK: 108000, EUR: 720, USD: 830.77 });
    expect(golden.pricesByTier['5-8']).toEqual({ ISK: 139500, EUR: 930, USD: 1073.08 });
  });

  it('keeps EUR exact (no FX drift) since the list is EUR-native', () => {
    for (const entry of listTours()) {
      const src = TOUR_FARES_EUR[entry.tourId];
      expect(entry.pricesByTier['1-4'].EUR).toBe(src['1-4']);
      expect(entry.pricesByTier['5-8'].EUR).toBe(src['5-8']);
    }
  });
});
