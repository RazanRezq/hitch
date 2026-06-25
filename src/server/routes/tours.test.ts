import { describe, it, expect } from 'vitest';
import { toursRoute } from './tours';
import { TOUR_IDS } from '@/lib/types';

function get(path: string) {
  return toursRoute.request(path, { method: 'GET' });
}
function postQuote(body: unknown) {
  return toursRoute.request('/quote', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('GET /api/tours — catalog', () => {
  it('returns every configured tour with per-tier, per-currency prices', async () => {
    const res = await get('/');
    expect(res.status).toBe(200);
    const json = (await res.json()) as { tours: { tourId: string }[] };
    expect(json.tours).toHaveLength(TOUR_IDS.length);
    expect(json.tours.map((t) => t.tourId)).toEqual([...TOUR_IDS]);
  });
});

describe('POST /api/tours/quote', () => {
  it('prices a tour in the requested currency', async () => {
    const res = await postQuote({ tourId: 'golden-circle', passengerCount: 2, displayCurrency: 'EUR' });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { basePriceISK: number; displayPrice: number };
    expect(json.basePriceISK).toBe(108000);
    expect(json.displayPrice).toBe(72000); // €720.00
  });

  it('defaults passengers and currency (ISK, 1 pax)', async () => {
    const res = await postQuote({ tourId: 'city-center' });
    const json = (await res.json()) as { displayCurrency: string; basePriceISK: number };
    expect(json.displayCurrency).toBe('ISK');
    expect(json.basePriceISK).toBe(4500); // €30 × 150
  });

  it('returns 422 manualQuoteRequired for a 9–16 group', async () => {
    const res = await postQuote({ tourId: 'snaefellsnes', passengerCount: 12 });
    expect(res.status).toBe(422);
    const json = (await res.json()) as { manualQuoteRequired: boolean; code: string };
    expect(json.manualQuoteRequired).toBe(true);
    expect(json.code).toBe('TOUR_TIER_UNSUPPORTED');
  });

  it('rejects an unknown tour id with a 400 validation error', async () => {
    const res = await postQuote({ tourId: 'not-a-tour' });
    expect(res.status).toBe(400);
  });
});
