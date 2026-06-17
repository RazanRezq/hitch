import { describe, it, expect, vi } from 'vitest';
import { exchangerateHostProvider, RatesProviderError } from './provider';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe('exchangerateHostProvider', () => {
  it('returns ISK→target rates and builds the request correctly', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: true, quotes: { ISKEUR: 0.0066, ISKUSD: 0.0071 } }),
    );
    const provider = exchangerateHostProvider({ apiKey: 'k', fetchImpl });

    const rates = await provider.fetchRates(['EUR', 'USD']);

    expect(rates).toEqual({ EUR: 0.0066, USD: 0.0071 });
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain('access_key=k');
    expect(url).toContain('source=ISK');
    expect(url).toContain('currencies=EUR%2CUSD');
  });

  it('omits currencies missing from the provider response', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, quotes: { ISKEUR: 0.0066 } }));
    const provider = exchangerateHostProvider({ apiKey: 'k', fetchImpl });

    const rates = await provider.fetchRates(['EUR', 'USD']);

    expect(rates.EUR).toBe(0.0066);
    expect(rates.USD).toBeUndefined();
  });

  it('does not call the network for an empty target list', async () => {
    const fetchImpl = vi.fn();
    const provider = exchangerateHostProvider({ apiKey: 'k', fetchImpl });

    await expect(provider.fetchRates([])).resolves.toEqual({});
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('throws when no API key is configured', async () => {
    const prev = process.env.EXCHANGE_RATE_API_KEY;
    delete process.env.EXCHANGE_RATE_API_KEY;
    try {
      const provider = exchangerateHostProvider({ fetchImpl: vi.fn() });
      await expect(provider.fetchRates(['EUR'])).rejects.toThrow(RatesProviderError);
    } finally {
      if (prev !== undefined) process.env.EXCHANGE_RATE_API_KEY = prev;
    }
  });

  it('surfaces a provider-side failure', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, error: { info: 'invalid access_key' } }),
    );
    const provider = exchangerateHostProvider({ apiKey: 'bad', fetchImpl });
    await expect(provider.fetchRates(['EUR'])).rejects.toThrow('invalid access_key');
  });

  it('throws on a non-2xx HTTP response', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false, 429));
    const provider = exchangerateHostProvider({ apiKey: 'k', fetchImpl });
    await expect(provider.fetchRates(['EUR'])).rejects.toThrow('HTTP 429');
  });
});
