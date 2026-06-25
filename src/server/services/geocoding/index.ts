import type { GeoCoord } from '@/lib/utils';

/**
 * Reverse geocoding: lat/lng → Icelandic postal code. Used by pricing to decide
 * the "Reykjavík flat fare" (postal 101–109 ONLY) vs the meter — radius
 * detection wrongly captured Kópavogur (200s) / Seltjarnarnes (170), so we must
 * resolve the real postal code.
 *
 * Uses the server-side, IP-restricted GOOGLE_MAPS_SERVER_KEY (never the public
 * key). API key + fetch are injectable so the service is unit-testable offline.
 * Returns null when no postal code can be determined — callers must treat null
 * as "unknown" and fall back to the meter, never guess a zone.
 */

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface ReverseGeocodeOptions {
  /** Defaults to process.env.GOOGLE_MAPS_SERVER_KEY. */
  apiKey?: string;
  /** Injectable fetch (defaults to global fetch) — for tests. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}
interface GeocodeResult {
  address_components?: GeocodeAddressComponent[];
}
interface GeocodeResponse {
  status: string;
  results?: GeocodeResult[];
}

function extractPostalCode(data: GeocodeResponse): number | null {
  for (const result of data.results ?? []) {
    for (const component of result.address_components ?? []) {
      if (component.types.includes('postal_code')) {
        const code = Number.parseInt(component.long_name, 10);
        if (Number.isInteger(code)) return code;
      }
    }
  }
  return null;
}

/**
 * Reverse-geocode a coordinate to its Icelandic postal code, or null if none is
 * found / the API is unavailable. Never throws — a pricing quote must not fail
 * because geocoding is down (it degrades to the meter).
 */
export async function reverseGeocodePostalCode(
  coord: GeoCoord,
  options: ReverseGeocodeOptions = {},
): Promise<number | null> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) return null;
  const doFetch = options.fetchImpl ?? fetch;

  const url = new URL(GEOCODE_URL);
  url.searchParams.set('latlng', `${coord.lat},${coord.lng}`);
  url.searchParams.set('result_type', 'postal_code');
  url.searchParams.set('region', 'is');
  url.searchParams.set('key', apiKey);

  try {
    const res = await doFetch(url.toString(), { signal: options.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as GeocodeResponse;
    if (data.status !== 'OK') return null;
    return extractPostalCode(data);
  } catch {
    return null;
  }
}

// Postal codes for a fixed location are static, so memoise by rounded coords.
const POSTAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const POSTAL_CACHE_MAX = 1000;
const COORD_CACHE_PRECISION = 4; // ~11 m

interface PostalCacheEntry {
  value: number | null;
  expiresAt: number;
}
const postalCache = new Map<string, PostalCacheEntry>();

function postalCacheKey(coord: GeoCoord): string {
  return `${coord.lat.toFixed(COORD_CACHE_PRECISION)},${coord.lng.toFixed(COORD_CACHE_PRECISION)}`;
}

/**
 * Cached {@link reverseGeocodePostalCode}. Memoises by rounded coordinates so
 * the public quote endpoint doesn't geocode the same pickup on every re-quote.
 * Negative results (null) are cached too — a coord with no postal code won't
 * suddenly gain one within the TTL.
 */
export async function reverseGeocodePostalCodeCached(
  coord: GeoCoord,
  options: ReverseGeocodeOptions = {},
): Promise<number | null> {
  const key = postalCacheKey(coord);
  const now = Date.now();
  const cached = postalCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await reverseGeocodePostalCode(coord, options);

  if (postalCache.size >= POSTAL_CACHE_MAX) {
    const oldest = postalCache.keys().next().value;
    if (oldest !== undefined) postalCache.delete(oldest);
  }
  postalCache.set(key, { value, expiresAt: now + POSTAL_CACHE_TTL_MS });
  return value;
}

/** Clear the in-memory postal cache. Test-only. */
export function __clearPostalCache(): void {
  postalCache.clear();
}
