import type { GeoCoord } from '@/lib/utils';
import { calculateDistance, isNearKEF } from '@/lib/utils';
import { LANDMARKS } from '@/lib/types';
import {
  computeFixedFareISK,
  computeMeterFareISK,
  type FareBreakdownISK,
  type FixedRouteId,
  type RateType,
} from './fare';

export interface PricingQuote {
  basePriceISK: number;
  distanceKm: number;
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
 * Quote a trip in ISK (the source of truth). Pre-agreed KEF corridors use the
 * fixed-fare table; everything else uses the metered rate card.
 *
 * NOTE: distance is currently the straight-line Haversine distance. Real road
 * distance (`getDrivingDistance`, Google Directions) is NOT yet wired in, so
 * metered fares for non-fixed routes under-estimate the true driven distance.
 * The fixed fares cover the primary KEF corridor exactly; wiring real distance
 * into the meter is a tracked follow-up.
 */
export async function quoteISK(
  pickup: GeoCoord,
  dropoff: GeoCoord,
  options: QuoteISKOptions = {},
): Promise<PricingQuote> {
  const passengerCount = options.passengerCount ?? 1;
  const at = options.at ?? new Date();
  const distanceKm = calculateDistance(pickup, dropoff);

  const fixedRoute = detectFixedRoute(pickup, dropoff);

  const fare = fixedRoute
    ? computeFixedFareISK(fixedRoute, passengerCount)
    : computeMeterFareISK({
        distanceKm,
        passengerCount,
        at,
        // Airport gate fee applies to metered KEF trips; fixed fares bake it in.
        includeAirportFee: options.isAirportTrip,
      });

  return {
    basePriceISK: fare.totalISK,
    distanceKm,
    pricingMode: fare.pricingMode,
    rateType: fare.rateType,
    breakdownISK: fare.breakdownISK,
  };
}
