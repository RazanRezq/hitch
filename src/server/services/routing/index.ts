import type { GeoCoord } from '@/lib/utils';

/**
 * Real driving distance + duration between two points, via the Google Maps
 * Directions API. This is the accurate, road-aware replacement for the
 * straight-line Haversine `calculateDistance()` in @/lib/utils — use it
 * wherever a real travel distance/ETA matters.
 *
 * Deliberately a PURE service: it returns raw {distanceMeters, durationSeconds}
 * and is NOT wired into the pricing formula. How (or whether) distance feeds the
 * fare is a pricing-policy decision still pending — see PROJECT_OVERVIEW.md.
 *
 * Auth uses the server-side, IP-restricted GOOGLE_MAPS_SERVER_KEY (never the
 * public NEXT_PUBLIC_GOOGLE_MAPS_KEY). The API key and fetch impl are injectable
 * so the service is unit-testable without network access.
 */
export interface RouteDistance {
  distanceMeters: number;
  durationSeconds: number;
}

export class RoutingError extends Error {
  constructor(
    message: string,
    readonly status?: string,
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}

export interface GetDrivingDistanceOptions {
  /** Defaults to process.env.GOOGLE_MAPS_SERVER_KEY. */
  apiKey?: string;
  /** Injectable fetch (defaults to global fetch) — for tests. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

interface DirectionsLeg {
  distance?: { value: number };
  duration?: { value: number };
}
interface DirectionsResponse {
  status: string;
  error_message?: string;
  routes?: Array<{ legs?: DirectionsLeg[] }>;
}

export async function getDrivingDistance(
  origin: GeoCoord,
  destination: GeoCoord,
  options: GetDrivingDistanceOptions = {},
): Promise<RouteDistance> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) throw new RoutingError('GOOGLE_MAPS_SERVER_KEY is not set');
  const doFetch = options.fetchImpl ?? fetch;

  const url = new URL(DIRECTIONS_URL);
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('region', 'is'); // bias routing to Iceland
  url.searchParams.set('key', apiKey);

  const res = await doFetch(url.toString(), { signal: options.signal });
  if (!res.ok) throw new RoutingError(`Directions API HTTP ${res.status}`);

  const data = (await res.json()) as DirectionsResponse;
  if (data.status !== 'OK') {
    throw new RoutingError(
      data.error_message ?? `Directions API status ${data.status}`,
      data.status,
    );
  }

  const leg = data.routes?.[0]?.legs?.[0];
  if (!leg?.distance || !leg?.duration) {
    throw new RoutingError('Directions API returned no usable route', data.status);
  }

  return {
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value,
  };
}
