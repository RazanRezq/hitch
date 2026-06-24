import type { Currency } from '@/lib/types';
import { CURRENCY_DECIMALS, DEFAULT_CURRENCY } from '@/lib/types';
import type { GeoCoord } from '@/lib/utils';
import { isNearKEF } from '@/lib/utils';
import { quoteISK, type DistanceSource, type PricingQuote, type QuoteISKOptions } from './index';
import { METER_FX_ISK_PER_UNIT } from './config';
import type { FareBreakdownISK, RateType } from './fare';

export interface GetQuoteInput {
  pickup: GeoCoord;
  dropoff: GeoCoord;
  passengerCount?: number;
  /** Trip start time — selects day/night/holiday rate. Defaults to now. */
  scheduledTime?: Date;
  displayCurrency?: Currency;
  /** Injectable road-distance lookup (defaults to cached Directions). For tests. */
  roadDistanceFn?: QuoteISKOptions['roadDistanceFn'];
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
  if (explicit !== undefined) return explicit;
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

  const pricing = await quoteISK(input.pickup, input.dropoff, {
    passengerCount: input.passengerCount,
    at: input.scheduledTime,
    originatesAtKef,
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
