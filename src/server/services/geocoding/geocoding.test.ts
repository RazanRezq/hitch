import { describe, it, expect, vi } from 'vitest';
import {
  __clearPostalCache,
  reverseGeocodePostalCode,
  reverseGeocodePostalCodeCached,
} from './index';

const RVK_101 = { lat: 64.1466, lng: -21.9426 };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

const postalResponse = (code: string) =>
  jsonResponse({
    status: 'OK',
    results: [
      {
        address_components: [
          { long_name: 'Reykjavík', short_name: 'RVK', types: ['locality'] },
          { long_name: code, short_name: code, types: ['postal_code'] },
        ],
      },
    ],
  });

describe('reverseGeocodePostalCode', () => {
  it('extracts the Icelandic postal code from the geocoding response', async () => {
    const fetchImpl = vi.fn(async () => postalResponse('101'));
    const code = await reverseGeocodePostalCode(RVK_101, { apiKey: 'k', fetchImpl });
    expect(code).toBe(101);
    const url = fetchImpl.mock.calls[0][0] as string;
    expect(url).toContain('latlng=64.1466%2C-21.9426');
    expect(url).toContain('result_type=postal_code');
  });

  it('returns null when no API key is available', async () => {
    const code = await reverseGeocodePostalCode(RVK_101, { apiKey: '', fetchImpl: vi.fn() });
    expect(code).toBeNull();
  });

  it('returns null on a non-OK API status', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 'ZERO_RESULTS' }));
    expect(await reverseGeocodePostalCode(RVK_101, { apiKey: 'k', fetchImpl })).toBeNull();
  });

  it('returns null when the response carries no postal_code component', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'OK', results: [{ address_components: [] }] }),
    );
    expect(await reverseGeocodePostalCode(RVK_101, { apiKey: 'k', fetchImpl })).toBeNull();
  });

  it('never throws — a fetch failure resolves to null', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    expect(await reverseGeocodePostalCode(RVK_101, { apiKey: 'k', fetchImpl })).toBeNull();
  });
});

describe('reverseGeocodePostalCodeCached', () => {
  it('memoises by coordinates, including negative (null) results', async () => {
    __clearPostalCache();
    const fetchImpl = vi.fn(async () => postalResponse('105'));
    const a = await reverseGeocodePostalCodeCached(RVK_101, { apiKey: 'k', fetchImpl });
    const b = await reverseGeocodePostalCodeCached(RVK_101, { apiKey: 'k', fetchImpl });
    expect(a).toBe(105);
    expect(b).toBe(105);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
