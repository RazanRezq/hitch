/**
 * Hitch fare engine — pure, deterministic core that turns (distance, waiting,
 * passengers, when) into an ISK fare plus, for fixed routes, an explicit
 * per-currency price. Every NUMBER lives in ./config — this file is logic only.
 *
 * ISK is the source of truth. FIXED routes carry hand-rounded per-currency
 * prices (no auto-conversion); METER display FX (150/130) is applied at the
 * quote layer, not here.
 */

import type { Currency } from '@/lib/types';
import { MAX_AUTO_PRICED_PASSENGERS } from '@/lib/types';
import {
  AIRPORT_FEE_APPLIES_TO_FIXED,
  AIRPORT_FEE_ISK,
  DAY_END_MINUTES,
  DAY_START_MINUTES,
  FARE_ROUNDING_ISK,
  FIRST_TIER_KM,
  FIXED_FARES,
  HOLIDAYS,
  RATE_CARD,
  type FixedPaxTier,
  type FixedRouteId,
  type MeterPaxTier,
  type RateType,
} from './config';

export type { FixedRouteId, RateType } from './config';
export type PaxTier = FixedPaxTier;

/**
 * Thrown when a trip cannot be auto-priced and needs a human quote — e.g. a
 * metered (off-list) trip for 9–16 passengers, which has no meter rate card.
 */
export class ManualQuoteRequiredError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ManualQuoteRequiredError';
  }
}

/**
 * Passenger count → fare tier (1–4, 5–8, or 9–16). Groups larger than the top
 * tier ({@link MAX_AUTO_PRICED_PASSENGERS}) have no rate card or fixed price and
 * throw {@link ManualQuoteRequiredError} — every pricing path runs through here,
 * so fixed, metered, combo, and tour quotes all surface the manual-quote signal
 * (a 422) for oversized groups instead of silently clamping them into 9–16.
 */
export function getPaxTier(passengerCount: number): FixedPaxTier {
  if (passengerCount > MAX_AUTO_PRICED_PASSENGERS) {
    throw new ManualQuoteRequiredError(
      'PAX_LIMIT_EXCEEDED',
      `Groups over ${MAX_AUTO_PRICED_PASSENGERS} passengers require a manual quote`,
    );
  }
  if (passengerCount <= 4) return '1-4';
  if (passengerCount <= 8) return '5-8';
  return '9-16';
}

/** Iceland-local `YYYY-MM-DD` for an instant. Iceland is UTC+0 year-round. */
function icelandYmd(at: Date): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, '0');
  const d = String(at.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Which rate type applies at a given instant (Iceland-local).
 * Priority: holiday > weekend (night all day) > weekday day-window vs night.
 */
export function getRateType(at: Date): RateType {
  if (HOLIDAYS.has(icelandYmd(at))) return 'holiday';
  const dow = at.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (dow === 0 || dow === 6) return 'night';
  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes();
  return minutes >= DAY_START_MINUTES && minutes < DAY_END_MINUTES ? 'day' : 'night';
}

/** Round a metered total to the nearest 50 ISK (the meter ticks every 50). */
export function roundFareISK(amount: number): number {
  return Math.round(amount / FARE_ROUNDING_ISK) * FARE_ROUNDING_ISK;
}

export interface FareBreakdownISK {
  startFee: number;
  distanceFee: number;
  waitingFee: number;
  airportFee: number;
  /** Non-zero only for fixed (pre-agreed) airport fares. */
  fixedFare: number;
}

export interface FareResult {
  /** Total in ISK, the source of truth. */
  totalISK: number;
  pricingMode: 'meter' | 'fixed';
  /** 'fixed' for pre-agreed fares; otherwise the meter rate type that applied. */
  rateType: RateType | 'fixed';
  breakdownISK: FareBreakdownISK;
  /** Explicit per-currency price (major units). Present only for fixed fares. */
  fixedPricesMajor?: Record<Currency, number>;
}

const ZERO_BREAKDOWN: FareBreakdownISK = {
  startFee: 0,
  distanceFee: 0,
  waitingFee: 0,
  airportFee: 0,
  fixedFare: 0,
};

export interface MeterFareInput {
  distanceKm: number;
  /** Waiting time in minutes. 0 for upfront quotes (waiting is metered live). */
  waitingMinutes?: number;
  passengerCount: number;
  /** When the trip starts — selects day/night/holiday rate. */
  at: Date;
  /** Add the KEF gate fee (meter trips that ORIGINATE at the airport). */
  includeAirportFee?: boolean;
  /**
   * Extra ISK added before rounding (e.g. the >100 km off-list surcharge). The
   * caller computes it; the engine just folds it into the total.
   */
  surchargeISK?: number;
}

/**
 * Compute a metered fare from the rate card. Throws {@link ManualQuoteRequiredError}
 * for 9–16 passengers (no meter rate card — needs a manual quote).
 */
export function computeMeterFareISK(input: MeterFareInput): FareResult {
  const tier = getPaxTier(input.passengerCount);
  if (tier === '9-16') {
    throw new ManualQuoteRequiredError(
      'METER_TIER_UNSUPPORTED',
      'Metered trips for 9–16 passengers require a manual quote',
    );
  }
  const meterTier: MeterPaxTier = tier;
  const rateType = getRateType(input.at);
  const rates = RATE_CARD[meterTier][rateType];

  const distanceKm = Math.max(0, input.distanceKm);
  const waitingMinutes = Math.max(0, input.waitingMinutes ?? 0);

  const startFee = rates.startFeeISK;
  const distanceFee =
    distanceKm <= 0
      ? 0
      : distanceKm <= FIRST_TIER_KM
        ? distanceKm * rates.firstKmRateISK
        : FIRST_TIER_KM * rates.firstKmRateISK +
          (distanceKm - FIRST_TIER_KM) * rates.afterKmRateISK;
  const waitingFee = (waitingMinutes / 60) * rates.waitPerHourISK;
  const airportFee = input.includeAirportFee ? AIRPORT_FEE_ISK : 0;
  const surchargeISK = Math.max(0, input.surchargeISK ?? 0);

  const totalISK = roundFareISK(startFee + distanceFee + waitingFee + airportFee + surchargeISK);

  return {
    totalISK,
    pricingMode: 'meter',
    rateType,
    breakdownISK: {
      startFee,
      distanceFee: Math.round(distanceFee + surchargeISK),
      waitingFee: Math.round(waitingFee),
      airportFee,
      fixedFare: 0,
    },
  };
}

/**
 * Compute a pre-agreed FIXED transfer fare. Returns the ISK total plus the
 * explicit per-currency TRANSFER prices (the client hand-rounds these — never
 * converted). The 490 ISK gate fee stacks on top when the trip ORIGINATES at
 * KEF (client-confirmed); it's reported separately in `breakdownISK.airportFee`
 * so the display layer converts it at the fixed FX, leaving the transfer prices
 * untouched.
 */
export function computeFixedFareISK(
  route: FixedRouteId,
  passengerCount: number,
  options: { includeAirportFee?: boolean } = {},
): FareResult {
  const tier = getPaxTier(passengerCount);
  const prices = FIXED_FARES[route][tier];
  const airportFee =
    options.includeAirportFee && AIRPORT_FEE_APPLIES_TO_FIXED ? AIRPORT_FEE_ISK : 0;
  return {
    totalISK: prices.ISK + airportFee,
    pricingMode: 'fixed',
    rateType: 'fixed',
    breakdownISK: { ...ZERO_BREAKDOWN, fixedFare: prices.ISK, airportFee },
    fixedPricesMajor: prices,
  };
}
