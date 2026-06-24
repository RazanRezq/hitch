import type { Currency } from '@/lib/types';
import { CURRENCY_DECIMALS, DEFAULT_CURRENCY } from '@/lib/types';
import type { GeoCoord } from '@/lib/utils';
import { isNearKEF } from '@/lib/utils';
import { getLatestRate } from '../currency';
import { quoteISK } from './index';
import type { FareBreakdownISK, RateType } from './fare';

export interface GetQuoteInput {
  pickup: GeoCoord;
  dropoff: GeoCoord;
  passengerCount?: number;
  /** Trip start time — selects day/night/holiday rate. Defaults to now. */
  scheduledTime?: Date;
  displayCurrency?: Currency;
}

export interface QuoteResult {
  basePriceISK: number;
  distanceKm: number;
  isAirportTrip: boolean;
  pricingMode: 'meter' | 'fixed';
  rateType: RateType | 'fixed';
  displayCurrency: Currency;
  displayPrice: number;
  exchangeRate: number;
  breakdownISK: FareBreakdownISK;
}

/**
 * Combines pricing (ISK source of truth) + currency conversion into a single
 * quote. The exchange rate returned here is what the booking row will lock at
 * creation time — see CLAUDE.md "ISK is the source of truth".
 */
export async function getQuote(input: GetQuoteInput): Promise<QuoteResult> {
  const isAirportTrip = isNearKEF(input.pickup) || isNearKEF(input.dropoff);

  const pricing = await quoteISK(input.pickup, input.dropoff, {
    passengerCount: input.passengerCount,
    at: input.scheduledTime,
    isAirportTrip,
  });

  const displayCurrency: Currency = input.displayCurrency ?? DEFAULT_CURRENCY;
  const exchangeRate = await getLatestRate(displayCurrency);

  if (exchangeRate <= 0) {
    throw new Error(`No exchange rate available for ISK→${displayCurrency}`);
  }

  // displayPrice is in the smallest currency unit (kr for ISK, cents for EUR/USD)
  // to match Booking.displayPrice and Stripe's amount convention. Format at the
  // UI layer by dividing by 10^CURRENCY_DECIMALS[currency].
  const decimals = CURRENCY_DECIMALS[displayCurrency];
  const factor = 10 ** decimals;
  const displayPrice = Math.round(pricing.basePriceISK * exchangeRate * factor);

  return {
    basePriceISK: pricing.basePriceISK,
    distanceKm: Math.round(pricing.distanceKm * 100) / 100,
    isAirportTrip,
    pricingMode: pricing.pricingMode,
    rateType: pricing.rateType,
    displayCurrency,
    displayPrice,
    exchangeRate,
    breakdownISK: pricing.breakdownISK,
  };
}
