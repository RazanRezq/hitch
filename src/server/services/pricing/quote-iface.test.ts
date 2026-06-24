import { describe, it, expect } from 'vitest';
import { detectFixedRoute, quoteISK } from './index';
import { LANDMARKS } from '@/lib/types';

const KEF = { lat: LANDMARKS.kef.lat, lng: LANDMARKS.kef.lng };
const RVK = { lat: LANDMARKS.reykjavik.lat, lng: LANDMARKS.reykjavik.lng };
const BLUE_LAGOON = { lat: LANDMARKS.blueLagoon.lat, lng: LANDMARKS.blueLagoon.lng };
const HVERAGERDI = { lat: 64.0, lng: -21.19 }; // a town that is not part of a fixed corridor

const WEEKDAY_NOON = new Date('2026-06-24T12:00:00Z');

describe('detectFixedRoute', () => {
  it('recognises KEF ↔ Reykjavík in both directions', () => {
    expect(detectFixedRoute(KEF, RVK)).toBe('reykjavik');
    expect(detectFixedRoute(RVK, KEF)).toBe('reykjavik');
  });

  it('recognises KEF ↔ Blue Lagoon in both directions', () => {
    expect(detectFixedRoute(KEF, BLUE_LAGOON)).toBe('blueLagoon');
    expect(detectFixedRoute(BLUE_LAGOON, KEF)).toBe('blueLagoon');
  });

  it('returns null when neither endpoint is KEF', () => {
    expect(detectFixedRoute(RVK, BLUE_LAGOON)).toBeNull();
  });

  it('returns null for a KEF trip to an unlisted destination', () => {
    expect(detectFixedRoute(KEF, HVERAGERDI)).toBeNull();
  });
});

describe('quoteISK', () => {
  it('uses the fixed fare for the KEF → Reykjavík corridor', async () => {
    const quote = await quoteISK(KEF, RVK, { passengerCount: 2, at: WEEKDAY_NOON });
    expect(quote.pricingMode).toBe('fixed');
    expect(quote.basePriceISK).toBe(22500);
    expect(quote.breakdownISK.fixedFare).toBe(22500);
  });

  it('uses the 5–8 fixed fare for larger groups', async () => {
    const quote = await quoteISK(KEF, BLUE_LAGOON, { passengerCount: 6, at: WEEKDAY_NOON });
    expect(quote.pricingMode).toBe('fixed');
    expect(quote.basePriceISK).toBe(16500);
  });

  it('falls back to the meter for non-corridor trips and adds the gate fee at KEF', async () => {
    const quote = await quoteISK(KEF, HVERAGERDI, {
      passengerCount: 1,
      at: WEEKDAY_NOON,
      isAirportTrip: true,
    });
    expect(quote.pricingMode).toBe('meter');
    expect(quote.rateType).toBe('day');
    expect(quote.breakdownISK.airportFee).toBe(500);
    expect(quote.basePriceISK).toBeGreaterThan(0);
  });
});
