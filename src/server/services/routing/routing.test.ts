import { describe, it, expect, vi } from 'vitest';
import type { GeoCoord } from '@/lib/utils';
import {
  __clearDistanceCache,
  getDrivingDistance,
  getDrivingDistanceCached,
  RoutingError,
} from './index';

const KEF: GeoCoord = { lat: 63.985, lng: -22.605 };
const RVK: GeoCoord = { lat: 64.1466, lng: -21.9426 };

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('getDrivingDistance', () => {
  it('returns road distance + duration and queries the Directions API correctly', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        status: 'OK',
        routes: [{ legs: [{ distance: { value: 49000 }, duration: { value: 2700 } }] }],
      }),
    );

    const result = await getDrivingDistance(KEF, RVK, { apiKey: 'k', fetchImpl });

    expect(result).toEqual({ distanceMeters: 49000, durationSeconds: 2700 });
    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toContain('origin=63.985%2C-22.605');
    expect(calledUrl).toContain('destination=64.1466%2C-21.9426');
    expect(calledUrl).toContain('mode=driving');
    expect(calledUrl).toContain('region=is');
    expect(calledUrl).toContain('key=k');
  });

  it('throws when no server key is available', async () => {
    const prev = process.env.GOOGLE_MAPS_SERVER_KEY;
    delete process.env.GOOGLE_MAPS_SERVER_KEY;
    try {
      await expect(getDrivingDistance(KEF, RVK, { fetchImpl: vi.fn() })).rejects.toThrow(
        RoutingError,
      );
    } finally {
      if (prev !== undefined) process.env.GOOGLE_MAPS_SERVER_KEY = prev;
    }
  });

  it('throws RoutingError carrying the API status when not OK', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 'ZERO_RESULTS' }));
    await expect(
      getDrivingDistance(KEF, RVK, { apiKey: 'k', fetchImpl }),
    ).rejects.toMatchObject({ name: 'RoutingError', status: 'ZERO_RESULTS' });
  });

  it('throws on a non-2xx HTTP response', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, false, 500));
    await expect(
      getDrivingDistance(KEF, RVK, { apiKey: 'k', fetchImpl }),
    ).rejects.toThrow('Directions API HTTP 500');
  });

  it('throws when the route has no usable leg', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 'OK', routes: [] }));
    await expect(
      getDrivingDistance(KEF, RVK, { apiKey: 'k', fetchImpl }),
    ).rejects.toThrow('no usable route');
  });
});

describe('getDrivingDistanceCached', () => {
  const okFetch = (meters: number) =>
    vi.fn(async () =>
      jsonResponse({
        status: 'OK',
        routes: [{ legs: [{ distance: { value: meters }, duration: { value: 1800 } }] }],
      }),
    );

  it('memoises by coordinates so repeat lookups skip the Directions API', async () => {
    __clearDistanceCache();
    const fetchImpl = okFetch(50000);
    const first = await getDrivingDistanceCached(KEF, RVK, { apiKey: 'k', fetchImpl });
    const second = await getDrivingDistanceCached(KEF, RVK, { apiKey: 'k', fetchImpl });
    expect(first).toEqual(second);
    expect(first.distanceMeters).toBe(50000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats different coordinate pairs as separate entries', async () => {
    __clearDistanceCache();
    const fetchImpl = okFetch(1000);
    await getDrivingDistanceCached(KEF, RVK, { apiKey: 'k', fetchImpl });
    await getDrivingDistanceCached(RVK, KEF, { apiKey: 'k', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
