/**
 * Tour pricing — the EUR-native sightseeing catalog (see hitch-docs/Tours.pdf).
 * A tour is a pre-agreed PER-CAR price selected by tour ID + passenger tier, NOT
 * a metered route: there is no pickup/dropoff, distance, waiting, or day/night
 * rate. Tours are manual/booked and never auto-dispatched.
 *
 * Currency model: the price list is quoted in EUR. ISK (the source of truth) is
 * EUR × 150 EXACTLY (TOUR_EUR_TO_ISK), so the standard customer display FX
 * (EUR = ISK / 150, USD = ISK / 130) reproduces the EUR list price exactly and
 * derives USD. No hand-rounded per-currency table is needed here — unlike the
 * FIXED transfer fares, whose EUR/USD prices are not simple conversions.
 *
 * Every NUMBER lives in ./config — this file is logic only.
 */

import type { Currency } from '@/lib/types';
import { CURRENCY_DECIMALS, DEFAULT_CURRENCY } from '@/lib/types';
import { METER_FX_ISK_PER_UNIT, TOUR_EUR_TO_ISK, TOUR_FARES_EUR, type TourId } from './config';
import { ManualQuoteRequiredError, getPaxTier } from './fare';

export type { TourId } from './config';

/** Tours are quoted for 1–4 and 5–8 passengers only (no 9–16 list price). */
export type TourPaxTier = '1-4' | '5-8';
const TOUR_PAX_TIERS: readonly TourPaxTier[] = ['1-4', '5-8'];

export interface TourFareResult {
  tourId: TourId;
  paxTier: TourPaxTier;
  /** Total in ISK, the source of truth (EUR list price × 150). */
  totalISK: number;
}

/**
 * Price a tour in ISK from the EUR-native catalog. Tours cover 1–8 passengers;
 * a 9–16 group has no list price and needs a manual quote — thrown as
 * {@link ManualQuoteRequiredError} so the route layer can return a 422.
 */
export function computeTourFareISK(tourId: TourId, passengerCount: number): TourFareResult {
  const tier = getPaxTier(passengerCount);
  if (tier === '9-16') {
    throw new ManualQuoteRequiredError(
      'TOUR_TIER_UNSUPPORTED',
      'Tours for 9–16 passengers require a manual quote',
    );
  }
  const eur = TOUR_FARES_EUR[tourId][tier];
  return { tourId, paxTier: tier, totalISK: eur * TOUR_EUR_TO_ISK };
}

/**
 * Display amount in MAJOR units. Customer-facing FX is fixed (EUR /150, USD /130),
 * never the live exchange-rate worker — see quote.ts and CLAUDE.md.
 */
function tourDisplayMajor(totalISK: number, currency: Currency): number {
  if (currency === 'ISK') return totalISK;
  return totalISK / METER_FX_ISK_PER_UNIT[currency];
}

export interface TourQuoteInput {
  tourId: TourId;
  passengerCount?: number;
  displayCurrency?: Currency;
}

export interface TourQuoteResult {
  tourId: TourId;
  paxTier: TourPaxTier;
  /** ISK source of truth. */
  basePriceISK: number;
  displayCurrency: Currency;
  /** Smallest currency unit (kr for ISK, cents for EUR/USD) — matches Stripe. */
  displayPrice: number;
  /** Locked onto the booking at creation time (display major ÷ ISK). */
  exchangeRate: number;
}

/** Quote a single tour in the caller's display currency. */
export function getTourQuote(input: TourQuoteInput): TourQuoteResult {
  const fare = computeTourFareISK(input.tourId, input.passengerCount ?? 1);
  const displayCurrency = input.displayCurrency ?? DEFAULT_CURRENCY;
  const displayMajor = tourDisplayMajor(fare.totalISK, displayCurrency);
  const factor = 10 ** CURRENCY_DECIMALS[displayCurrency];
  return {
    tourId: fare.tourId,
    paxTier: fare.paxTier,
    basePriceISK: fare.totalISK,
    displayCurrency,
    displayPrice: Math.round(displayMajor * factor),
    exchangeRate: fare.totalISK > 0 ? displayMajor / fare.totalISK : 1,
  };
}

export interface TourCatalogEntry {
  tourId: TourId;
  /**
   * Per-tier price in every currency, MAJOR units rounded to the currency's
   * decimals (ISK whole, EUR/USD 2dp) — display-ready.
   */
  pricesByTier: Record<TourPaxTier, Record<Currency, number>>;
}

/** Round a major-unit amount to the currency's display decimals. */
function roundMajor(amount: number, currency: Currency): number {
  const factor = 10 ** CURRENCY_DECIMALS[currency];
  return Math.round(amount * factor) / factor;
}

/**
 * The full tour catalog with per-tier, per-currency MAJOR-unit prices. Display
 * metadata (localized name, duration, description, hero image) is intentionally
 * NOT here — that arrives with the i18n/UI slice. This is the price source only.
 */
export function listTours(): TourCatalogEntry[] {
  return (Object.keys(TOUR_FARES_EUR) as TourId[]).map((tourId) => {
    const pricesByTier = {} as Record<TourPaxTier, Record<Currency, number>>;
    for (const tier of TOUR_PAX_TIERS) {
      const totalISK = TOUR_FARES_EUR[tourId][tier] * TOUR_EUR_TO_ISK;
      pricesByTier[tier] = {
        ISK: totalISK,
        EUR: roundMajor(totalISK / METER_FX_ISK_PER_UNIT.EUR, 'EUR'),
        USD: roundMajor(totalISK / METER_FX_ISK_PER_UNIT.USD, 'USD'),
      };
    }
    return { tourId, pricesByTier };
  });
}
