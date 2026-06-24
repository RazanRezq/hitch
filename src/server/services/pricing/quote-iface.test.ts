import { describe, it, expect, vi } from 'vitest';
import { detectFixedRoute, quoteISK, ManualQuoteRequiredError } from './index';
import type { RouteDistance } from '../routing';
import { LANDMARKS } from '@/lib/types';

/** Stub a road-distance lookup returning a fixed number of kilometres. */
const roadKm = (km: number) =>
  vi.fn(async (): Promise<RouteDistance> => ({ distanceMeters: km * 1000, durationSeconds: 0 }));

const KEF = { lat: LANDMARKS.kef.lat, lng: LANDMARKS.kef.lng };
const RVK = { lat: LANDMARKS.reykjavik.lat, lng: LANDMARKS.reykjavik.lng };
const BLUE_LAGOON = { lat: LANDMARKS.blueLagoon.lat, lng: LANDMARKS.blueLagoon.lng };
const HVERAGERDI = { lat: 64.0, lng: -21.19 }; // off-list town, not part of a fixed corridor

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
  it('uses the fixed fare for the KEF → Reykjavík corridor without calling routing', async () => {
    const roadDistanceFn = roadKm(50);
    const quote = await quoteISK(KEF, RVK, {
      passengerCount: 2,
      at: WEEKDAY_NOON,
      roadDistanceFn,
    });
    expect(quote.pricingMode).toBe('fixed');
    expect(quote.basePriceISK).toBe(22500);
    expect(quote.fixedPricesMajor).toEqual({ ISK: 22500, EUR: 150, USD: 170 });
    expect(quote.distanceSource).toBe('straight-line');
    expect(roadDistanceFn).not.toHaveBeenCalled(); // fixed fares ignore distance
  });

  it('uses the 9-16 fixed fare for minibus groups', async () => {
    const quote = await quoteISK(KEF, BLUE_LAGOON, {
      passengerCount: 12,
      at: WEEKDAY_NOON,
      roadDistanceFn: roadKm(20),
    });
    expect(quote.pricingMode).toBe('fixed');
    expect(quote.basePriceISK).toBe(33000);
    expect(quote.fixedPricesMajor?.EUR).toBe(220);
  });

  it('drives the meter with road distance and adds the 490 fee on KEF-origin trips', async () => {
    const roadDistanceFn = roadKm(45);
    const quote = await quoteISK(KEF, HVERAGERDI, {
      passengerCount: 1,
      at: WEEKDAY_NOON,
      originatesAtKef: true,
      roadDistanceFn,
    });
    // 1–4 day: 850 + (4*545 + 41*388) + 490 = 19428 → round50 = 19450
    expect(quote.pricingMode).toBe('meter');
    expect(quote.rateType).toBe('day');
    expect(quote.distanceSource).toBe('road');
    expect(quote.distanceKm).toBe(45);
    expect(quote.breakdownISK.airportFee).toBe(490);
    expect(quote.basePriceISK).toBe(19450);
  });

  it('applies the >100 km off-list surcharge: meter first 100 km + 375 ISK/km', async () => {
    const quote = await quoteISK(RVK, HVERAGERDI, {
      passengerCount: 1,
      at: WEEKDAY_NOON,
      roadDistanceFn: roadKm(150),
    });
    // meter(100km) 850 + 4*545 + 96*388 = 40278; surcharge 375*50 = 18750
    // → 59028 → round50 = 59050
    expect(quote.pricingMode).toBe('meter');
    expect(quote.distanceKm).toBe(150);
    expect(quote.basePriceISK).toBe(59050);
  });

  it('refuses to meter a 9–16 passenger off-list trip', async () => {
    await expect(
      quoteISK(RVK, HVERAGERDI, {
        passengerCount: 12,
        at: WEEKDAY_NOON,
        roadDistanceFn: roadKm(45),
      }),
    ).rejects.toBeInstanceOf(ManualQuoteRequiredError);
  });

  it('falls back to straight-line distance when routing is unavailable', async () => {
    const roadDistanceFn = vi.fn(async (): Promise<never> => {
      throw new Error('Directions API down');
    });
    const quote = await quoteISK(KEF, HVERAGERDI, {
      passengerCount: 1,
      at: WEEKDAY_NOON,
      roadDistanceFn,
    });
    expect(quote.pricingMode).toBe('meter');
    expect(quote.distanceSource).toBe('straight-line');
    expect(quote.basePriceISK).toBeGreaterThan(0);
  });
});
