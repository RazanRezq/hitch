import type { Currency } from '@/lib/types';
import { CURRENCY_DECIMALS, DEFAULT_CURRENCY } from '@/lib/types';
import type { GeoCoord } from '@/lib/utils';
import { isNearKEF } from '@/lib/utils';
import { quoteISK, type DistanceSource, type PricingQuote, type QuoteISKOptions, type ZoneEndpoints } from './index';
import { METER_FX_ISK_PER_UNIT } from './config';
import { reverseGeocodePostalCodeCached } from '../geocoding';
import type { FareBreakdownISK, RateType } from './fare';

type GeocodeFn = (coord: GeoCoord) => Promise<number | null>;

export interface GetQuoteInput {
  pickup: GeoCoord;
  dropoff: GeoCoord;
  passengerCount?: number;
  /** Trip start time — selects day/night/holiday rate. Defaults to now. */
  scheduledTime?: Date;
  displayCurrency?: Currency;
  /** Injectable road-distance lookup (defaults to cached Directions). For tests. */
  roadDistanceFn?: QuoteISKOptions['roadDistanceFn'];
  /** Injectable reverse-geocoder (defaults to cached Geocoding API). For tests. */
  geocodeFn?: GeocodeFn;
}

/**
 * Resolve endpoint postal codes needed for the 101–109 Reykjavík flat fare.
 * Only the non-KEF endpoint of a KEF transfer needs geocoding — everything else
 * meters regardless, so we skip the call (and its cost) entirely.
 */
async function resolveZones(
  pickup: GeoCoord,
  dropoff: GeoCoord,
  geocode: GeocodeFn,
): Promise<ZoneEndpoints> {
  const pickupAtKef = isNearKEF(pickup);
  const dropoffAtKef = isNearKEF(dropoff);
  if (pickupAtKef === dropoffAtKef) return {}; // not a KEF transfer → meter anyway

  if (pickupAtKef) return { dropoffPostal: await geocode(dropoff) };
  return { pickupPostal: await geocode(pickup) };
}

export interface QuoteResult {
  basePriceISK: number;
  distanceKm: number;
  distanceSource: DistanceSource;
  isAirportTrip: boolean;
  pricingMode: 'meter' | 'fixed';
  rateType: RateType | 'fixed';
  displayCurrency: Currency;
  displayPrice: number;
  exchangeRate: number;
  breakdownISK: FareBreakdownISK;
}

/**
 * Display amount in MAJOR currency units. Customer-facing FX is fixed, never the
 * live exchange-rate worker (which is now accounting/internal only):
 *  - ISK   → 1:1 with the ISK source of truth.
 *  - FIXED routes → the client's explicit hand-rounded per-currency price.
 *  - METER → ISK divided by the fixed constant (EUR /150, USD /130).
 */
function resolveDisplayMajor(pricing: PricingQuote, currency: Currency): number {
  if (currency === 'ISK') return pricing.basePriceISK;
  const explicit = pricing.fixedPricesMajor?.[currency];
  if (explicit !== undefined) {
    // fixedPricesMajor is the transfer-only price; add the KEF gate fee (if any)
    // converted at the fixed FX so the displayed total matches basePriceISK.
    const feeMajor = pricing.breakdownISK.airportFee / METER_FX_ISK_PER_UNIT[currency];
    return explicit + feeMajor;
  }
  return pricing.basePriceISK / METER_FX_ISK_PER_UNIT[currency];
}

/**
 * Combines pricing (ISK source of truth) + fixed display FX into a single quote.
 * The exchangeRate returned here is locked onto the booking at creation time —
 * see CLAUDE.md "ISK is the source of truth".
 */
export async function getQuote(input: GetQuoteInput): Promise<QuoteResult> {
  const originatesAtKef = isNearKEF(input.pickup);
  const isAirportTrip = originatesAtKef || isNearKEF(input.dropoff);

  const geocode = input.geocodeFn ?? reverseGeocodePostalCodeCached;
  const zones = await resolveZones(input.pickup, input.dropoff, geocode);

  const pricing = await quoteISK(input.pickup, input.dropoff, {
    passengerCount: input.passengerCount,
    at: input.scheduledTime,
    originatesAtKef,
    zones,
    roadDistanceFn: input.roadDistanceFn,
  });

  const displayCurrency: Currency = input.displayCurrency ?? DEFAULT_CURRENCY;
  const displayMajor = resolveDisplayMajor(pricing, displayCurrency);

  // displayPrice is in the smallest currency unit (kr for ISK, cents for EUR/USD)
  // to match Booking.displayPrice and Stripe's amount convention.
  const factor = 10 ** CURRENCY_DECIMALS[displayCurrency];
  const displayPrice = Math.round(displayMajor * factor);
  const exchangeRate = pricing.basePriceISK > 0 ? displayMajor / pricing.basePriceISK : 1;

  return {
    basePriceISK: pricing.basePriceISK,
    distanceKm: Math.round(pricing.distanceKm * 100) / 100,
    distanceSource: pricing.distanceSource,
    isAirportTrip,
    pricingMode: pricing.pricingMode,
    rateType: pricing.rateType,
    displayCurrency,
    displayPrice,
    exchangeRate,
    breakdownISK: pricing.breakdownISK,
  };
}
