import type { GeoCoord } from '@/lib/utils';
import { calculateDistance, isNearKEF } from '@/lib/utils';
import { LANDMARKS } from '@/lib/types';
import { getDrivingDistanceCached, type RouteDistance } from '../routing';
import {
  computeFixedFareISK,
  computeMeterFareISK,
  type FareBreakdownISK,
  type FixedRouteId,
  type RateType,
} from './fare';

export type DistanceSource = 'road' | 'straight-line';

export interface PricingQuote {
  basePriceISK: number;
  distanceKm: number;
  /** Whether distanceKm came from the Directions API or the Haversine fallback. */
  distanceSource: DistanceSource;
  pricingMode: 'meter' | 'fixed';
  rateType: RateType | 'fixed';
  breakdownISK: FareBreakdownISK;
}

export interface QuoteISKOptions {
  passengerCount?: number;
  /** Trip start time — selects day/night/holiday rate. Defaults to now. */
  at?: Date;
  /** Whether the trip touches KEF (pickup or dropoff). */
  isAirportTrip?: boolean;
  /** Injectable road-distance lookup (defaults to the cached Directions API). */
  roadDistanceFn?: (origin: GeoCoord, destination: GeoCoord) => Promise<RouteDistance>;
}

/**
 * Radii (km) used to recognise the pre-agreed KEF transfer corridors. KEF reuses
 * the shared 5 km `isNearKEF`. Blue Lagoon is a single spot (tight radius);
 * Reykjavík covers the capital region. These never overlap (RVK↔KEF ≈ 38 km,
 * BlueLagoon↔KEF ≈ 14 km, RVK↔BlueLagoon ≈ 38 km), so detection is unambiguous.
 */
const BLUE_LAGOON_RADIUS_KM = 6;
const REYKJAVIK_RADIUS_KM = 18;

function isNear(point: GeoCoord, landmark: GeoCoord, radiusKm: number): boolean {
  return calculateDistance(point, landmark) <= radiusKm;
}

/**
 * Detect a pre-agreed fixed-fare route. A fixed fare applies only to a genuine
 * KEF transfer: exactly one endpoint at KEF and the other at Reykjavík or the
 * Blue Lagoon. Anything else (including KEF→KEF or city→city) falls to the meter.
 */
export function detectFixedRoute(pickup: GeoCoord, dropoff: GeoCoord): FixedRouteId | null {
  const pickupAtKef = isNearKEF(pickup);
  const dropoffAtKef = isNearKEF(dropoff);
  if (pickupAtKef === dropoffAtKef) return null; // both or neither at KEF

  const other = pickupAtKef ? dropoff : pickup;
  if (isNear(other, LANDMARKS.blueLagoon, BLUE_LAGOON_RADIUS_KM)) return 'blueLagoon';
  if (isNear(other, LANDMARKS.reykjavik, REYKJAVIK_RADIUS_KM)) return 'reykjavik';
  return null;
}

/**
 * Resolve the trip distance for a metered fare. Uses the real road distance
 * (cached Directions API) and falls back to straight-line Haversine if routing
 * is unavailable — a price preview must never hard-fail because Google is down.
 */
async function resolveMeterDistanceKm(
  pickup: GeoCoord,
  dropoff: GeoCoord,
  roadDistanceFn: NonNullable<QuoteISKOptions['roadDistanceFn']>,
): Promise<{ distanceKm: number; distanceSource: DistanceSource }> {
  try {
    const road = await roadDistanceFn(pickup, dropoff);
    return { distanceKm: road.distanceMeters / 1000, distanceSource: 'road' };
  } catch (err) {
    console.warn('[pricing] road distance unavailable, using straight-line', err);
    return { distanceKm: calculateDistance(pickup, dropoff), distanceSource: 'straight-line' };
  }
}

/**
 * Quote a trip in ISK (the source of truth). Pre-agreed KEF corridors use the
 * fixed-fare table; everything else uses the metered rate card driven by real
 * road distance.
 *
 * Distance handling: fixed-fare routes ignore distance for pricing, so they skip
 * the Directions call entirely and report straight-line distance for display
 * only. Metered routes fetch real road distance (cached) — it directly drives
 * the fare — with a Haversine fallback when routing is unavailable.
 */
export async function quoteISK(
  pickup: GeoCoord,
  dropoff: GeoCoord,
  options: QuoteISKOptions = {},
): Promise<PricingQuote> {
  const passengerCount = options.passengerCount ?? 1;
  const at = options.at ?? new Date();
  const roadDistanceFn = options.roadDistanceFn ?? getDrivingDistanceCached;

  const fixedRoute = detectFixedRoute(pickup, dropoff);

  if (fixedRoute) {
    const fare = computeFixedFareISK(fixedRoute, passengerCount);
    return {
      basePriceISK: fare.totalISK,
      distanceKm: calculateDistance(pickup, dropoff),
      distanceSource: 'straight-line',
      pricingMode: fare.pricingMode,
      rateType: fare.rateType,
      breakdownISK: fare.breakdownISK,
    };
  }

  const { distanceKm, distanceSource } = await resolveMeterDistanceKm(
    pickup,
    dropoff,
    roadDistanceFn,
  );
  const fare = computeMeterFareISK({
    distanceKm,
    passengerCount,
    at,
    // Airport gate fee applies to metered KEF trips; fixed fares bake it in.
    includeAirportFee: options.isAirportTrip,
  });

  return {
    basePriceISK: fare.totalISK,
    distanceKm,
    distanceSource,
    pricingMode: fare.pricingMode,
    rateType: fare.rateType,
    breakdownISK: fare.breakdownISK,
  };
}
