import type { GeoCoord } from '@/lib/utils';
import { calculateDistance, isNearKEF } from '@/lib/utils';
import { LANDMARKS, type Currency } from '@/lib/types';
import { getDrivingDistanceCached, type RouteDistance } from '../routing';
import {
  computeFixedFareISK,
  computeMeterFareISK,
  type FareBreakdownISK,
  type FixedRouteId,
  type RateType,
} from './fare';
import {
  OFF_LIST_DISTANCE_THRESHOLD_KM,
  OFF_LIST_SURCHARGE_ISK_PER_KM,
  REYKJAVIK_FLAT_FARE_POSTAL_CODES,
} from './config';

export { ManualQuoteRequiredError } from './fare';
export {
  computeTourFareISK,
  getTourQuote,
  listTours,
  type TourCatalogEntry,
  type TourFareResult,
  type TourId,
  type TourPaxTier,
  type TourQuoteInput,
  type TourQuoteResult,
} from './tours';

export type DistanceSource = 'road' | 'straight-line';

export interface PricingQuote {
  basePriceISK: number;
  distanceKm: number;
  /** Whether distanceKm came from the Directions API or the Haversine fallback. */
  distanceSource: DistanceSource;
  pricingMode: 'meter' | 'fixed';
  rateType: RateType | 'fixed';
  breakdownISK: FareBreakdownISK;
  /** Explicit per-currency price (major units). Present only for fixed fares. */
  fixedPricesMajor?: Record<Currency, number>;
}

/** Postal codes of the trip endpoints (from reverse geocoding). */
export interface ZoneEndpoints {
  pickupPostal?: number | null;
  dropoffPostal?: number | null;
}

export interface QuoteISKOptions {
  passengerCount?: number;
  /** Trip start time — selects day/night/holiday rate. Defaults to now. */
  at?: Date;
  /** Whether the trip ORIGINATES at KEF — drives the 490 ISK gate fee (meter only). */
  originatesAtKef?: boolean;
  /** Endpoint postal codes — required to recognise the 101–109 Reykjavík fare. */
  zones?: ZoneEndpoints;
  /** Injectable road-distance lookup (defaults to the cached Directions API). */
  roadDistanceFn?: (origin: GeoCoord, destination: GeoCoord) => Promise<RouteDistance>;
}

/** Blue Lagoon is a single facility — point-detected (postal 240 over-captures Grindavík). */
const BLUE_LAGOON_RADIUS_KM = 6;

function isNear(point: GeoCoord, landmark: GeoCoord, radiusKm: number): boolean {
  return calculateDistance(point, landmark) <= radiusKm;
}

/**
 * Detect a pre-agreed fixed-fare route. A fixed fare applies only to a genuine
 * KEF transfer: exactly one endpoint at KEF and the other at the Blue Lagoon or
 * Reykjavík proper.
 *
 * KEF and Blue Lagoon are point facilities (coordinate-detected). "Reykjavík"
 * is the FLAT-FARE zone = postal codes 101–109 ONLY, resolved by geocoding —
 * greater-Reykjavík (110/112/170/200…) is NOT the flat fare and falls to the
 * meter. Without a postal code for the non-KEF endpoint, Reykjavík cannot be
 * confirmed and the trip meters.
 */
export function detectFixedRoute(
  pickup: GeoCoord,
  dropoff: GeoCoord,
  zones: ZoneEndpoints = {},
): FixedRouteId | null {
  const pickupAtKef = isNearKEF(pickup);
  const dropoffAtKef = isNearKEF(dropoff);
  if (pickupAtKef === dropoffAtKef) return null; // both or neither at KEF

  const other = pickupAtKef ? dropoff : pickup;
  const otherPostal = pickupAtKef ? zones.dropoffPostal : zones.pickupPostal;

  if (isNear(other, LANDMARKS.blueLagoon, BLUE_LAGOON_RADIUS_KM)) return 'blueLagoon';
  if (otherPostal != null && REYKJAVIK_FLAT_FARE_POSTAL_CODES.includes(otherPostal)) {
    return 'reykjavik';
  }
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

  const fixedRoute = detectFixedRoute(pickup, dropoff, options.zones);

  if (fixedRoute) {
    // 490 gate fee stacks on fixed fares only when the trip ORIGINATES at KEF.
    const fare = computeFixedFareISK(fixedRoute, passengerCount, {
      includeAirportFee: options.originatesAtKef,
    });
    return {
      basePriceISK: fare.totalISK,
      distanceKm: calculateDistance(pickup, dropoff),
      distanceSource: 'straight-line',
      pricingMode: fare.pricingMode,
      rateType: fare.rateType,
      breakdownISK: fare.breakdownISK,
      fixedPricesMajor: fare.fixedPricesMajor,
    };
  }

  const { distanceKm, distanceSource } = await resolveMeterDistanceKm(
    pickup,
    dropoff,
    roadDistanceFn,
  );

  // Off-list >100 km: meter the first 100 km, then add the per-km surcharge.
  // (Surcharge = 375 kr/km — the ISK-native equivalent of 2.50 EUR/km at the
  //  locked 150 rate; client-confirmed ISK-native 2026-06-26, not live-FX euros.)
  const overThreshold = Math.max(0, distanceKm - OFF_LIST_DISTANCE_THRESHOLD_KM);
  const meterDistanceKm = overThreshold > 0 ? OFF_LIST_DISTANCE_THRESHOLD_KM : distanceKm;
  const surchargeISK = overThreshold * OFF_LIST_SURCHARGE_ISK_PER_KM;

  const fare = computeMeterFareISK({
    distanceKm: meterDistanceKm,
    passengerCount,
    at,
    // 490 ISK gate fee only when the trip ORIGINATES at KEF.
    includeAirportFee: options.originatesAtKef,
    surchargeISK,
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
