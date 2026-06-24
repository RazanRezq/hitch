import { describe, it, expect, vi } from 'vitest';
import { detectFixedRoute, quoteISK } from './index';
import type { RouteDistance } from '../routing';
import { LANDMARKS } from '@/lib/types';

/** Stub a road-distance lookup returning a fixed number of kilometres. */
const roadKm = (km: number) =>
  vi.fn(async (): Promise<RouteDistance> => ({ distanceMeters: km * 1000, durationSeconds: 0 }));

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
  it('uses the fixed fare for the KEF → Reykjavík corridor without calling routing', async () => {
    const roadDistanceFn = roadKm(50);
    const quote = await quoteISK(KEF, RVK, {
      passengerCount: 2,
      at: WEEKDAY_NOON,
      roadDistanceFn,
    });
    expect(quote.pricingMode).toBe('fixed');
    expect(quote.basePriceISK).toBe(22500);
    expect(quote.breakdownISK.fixedFare).toBe(22500);
    expect(quote.distanceSource).toBe('straight-line');
    expect(roadDistanceFn).not.toHaveBeenCalled(); // fixed fares ignore distance
  });

  it('uses the 5–8 fixed fare for larger groups', async () => {
    const quote = await quoteISK(KEF, BLUE_LAGOON, {
      passengerCount: 6,
      at: WEEKDAY_NOON,
      roadDistanceFn: roadKm(20),
    });
    expect(quote.pricingMode).toBe('fixed');
    expect(quote.basePriceISK).toBe(16500);
  });

  it('drives the meter with real road distance and adds the gate fee at KEF', async () => {
    const roadDistanceFn = roadKm(45);
    const quote = await quoteISK(KEF, HVERAGERDI, {
      passengerCount: 1,
      at: WEEKDAY_NOON,
      isAirportTrip: true,
      roadDistanceFn,
    });
    // 1–4 day: 850 + (4*545 + 41*388) + 500 = 19438 → round100 = 19400
    expect(quote.pricingMode).toBe('meter');
    expect(quote.rateType).toBe('day');
    expect(quote.distanceSource).toBe('road');
    expect(quote.distanceKm).toBe(45);
    expect(quote.breakdownISK.airportFee).toBe(500);
    expect(quote.basePriceISK).toBe(19400);
    expect(roadDistanceFn).toHaveBeenCalledOnce();
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
