import { describe, it, expect, vi } from 'vitest';
import { getQuote } from './quote';
import type { RouteDistance } from '../routing';
import { LANDMARKS } from '@/lib/types';

const roadKm = (km: number) =>
  vi.fn(async (): Promise<RouteDistance> => ({ distanceMeters: km * 1000, durationSeconds: 0 }));

const KEF = { lat: LANDMARKS.kef.lat, lng: LANDMARKS.kef.lng };
const RVK = { lat: LANDMARKS.reykjavik.lat, lng: LANDMARKS.reykjavik.lng };
const HVERAGERDI = { lat: 64.0, lng: -21.19 };
const WEEKDAY_NOON = new Date('2026-06-24T12:00:00Z');

describe('getQuote — fixed fares use explicit per-currency prices (no auto-conversion)', () => {
  it('quotes the KEF → Reykjavík fixed fare in ISK', async () => {
    const q = await getQuote({ pickup: KEF, dropoff: RVK, passengerCount: 2, displayCurrency: 'ISK', geocodeFn: async () => 101 });
    expect(q.pricingMode).toBe('fixed');
    expect(q.basePriceISK).toBe(22500);
    expect(q.displayPrice).toBe(22500); // ISK has no minor unit
    expect(q.exchangeRate).toBe(1);
  });

  it('quotes the explicit EUR price (150 → 15000 cents), not a converted one', async () => {
    const q = await getQuote({ pickup: KEF, dropoff: RVK, passengerCount: 2, displayCurrency: 'EUR', geocodeFn: async () => 101 });
    expect(q.displayPrice).toBe(15000); // 150.00 EUR
    expect(q.exchangeRate).toBeCloseTo(150 / 22500, 8);
  });

  it('quotes the explicit USD price (170 → 17000 cents)', async () => {
    const q = await getQuote({ pickup: KEF, dropoff: RVK, passengerCount: 2, displayCurrency: 'USD', geocodeFn: async () => 101 });
    expect(q.displayPrice).toBe(17000);
  });
});

describe('getQuote — metered fares convert at the fixed 150/130 constants (not live FX)', () => {
  it('returns ISK at 1:1', async () => {
    const q = await getQuote({
      pickup: RVK,
      dropoff: HVERAGERDI,
      passengerCount: 1,
      scheduledTime: WEEKDAY_NOON,
      displayCurrency: 'ISK',
      roadDistanceFn: roadKm(45),
    });
    // 1–4 day: 850 + (4*545 + 41*388) = 18938 → round50 = 18950
    expect(q.pricingMode).toBe('meter');
    expect(q.basePriceISK).toBe(18950);
    expect(q.displayPrice).toBe(18950);
  });

  it('converts EUR at /150 and USD at /130', async () => {
    const eur = await getQuote({
      pickup: RVK,
      dropoff: HVERAGERDI,
      passengerCount: 1,
      scheduledTime: WEEKDAY_NOON,
      displayCurrency: 'EUR',
      roadDistanceFn: roadKm(45),
    });
    expect(eur.displayPrice).toBe(Math.round((18950 / 150) * 100)); // 12633 cents
    expect(eur.exchangeRate).toBeCloseTo(1 / 150, 8);

    const usd = await getQuote({
      pickup: RVK,
      dropoff: HVERAGERDI,
      passengerCount: 1,
      scheduledTime: WEEKDAY_NOON,
      displayCurrency: 'USD',
      roadDistanceFn: roadKm(45),
    });
    expect(usd.displayPrice).toBe(Math.round((18950 / 130) * 100)); // 14577 cents
  });
});
