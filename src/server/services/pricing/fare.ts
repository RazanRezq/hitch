/**
 * Hitch fare engine — a faithful, pure port of the official Hitch Taxi price
 * list (hitch-docs/PriceList Clear Window Logo Clear New.jpg, cross-checked
 * against hitch-docs/hitch_taxi_fare_calculator.html).
 *
 * This module has NO I/O — it is the deterministic core that turns
 * (distance, waiting time, passenger count, when) into an ISK fare so it can be
 * unit-tested against the printed price list. Route detection, currency
 * conversion and DB access live in the surrounding services.
 *
 * Authoritative facts encoded here (do not "tidy" the numbers — they are the
 * client's published rates):
 *  - Two passenger tiers only: 1–4 and 5–8. The price list defines no other
 *    tier; `passengerCount` is capped at 8 in the booking schema. A future
 *    9–16 (VAN) tier would slot into RATE_CARD / FIXED_FARES once the client
 *    publishes its numbers — DO NOT invent them.
 *  - Three rate types: day (08:00–17:00 weekdays), night (17:00–08:00 weekdays
 *    + all weekend), holiday (+35%, full day).
 *  - Distance is tiered: the first 4 km bill at the higher per-km rate, the
 *    remainder at the lower rate.
 *  - KEF airport transfers have pre-agreed FIXED fares that bypass the meter.
 *
 * ISK is the source of truth (see CLAUDE.md). EUR/USD are derived at the quote
 * layer using the locked exchange rate — never here.
 */

export type PaxTier = '1-4' | '5-8';
export type RateType = 'day' | 'night' | 'holiday';
export type FixedRouteId = 'reykjavik' | 'blueLagoon';

interface RateCardEntry {
  /** Flat start fee (Startgjald). */
  startFeeISK: number;
  /** Waiting charge per hour (Biðgjald). */
  waitPerHourISK: number;
  /** Per-km rate for the first 4 km (Fyrstu 4 km). */
  firstKmRateISK: number;
  /** Per-km rate beyond 4 km (Eftir 4 km). */
  afterKmRateISK: number;
}

/**
 * The meter rate card, verbatim from the price list. Outer key = passenger
 * tier, inner key = rate type.
 */
export const RATE_CARD: Record<PaxTier, Record<RateType, RateCardEntry>> = {
  '1-4': {
    day: { startFeeISK: 850, waitPerHourISK: 13680, firstKmRateISK: 545, afterKmRateISK: 388 },
    night: { startFeeISK: 850, waitPerHourISK: 14340, firstKmRateISK: 582, afterKmRateISK: 437 },
    holiday: { startFeeISK: 1150, waitPerHourISK: 19200, firstKmRateISK: 802, afterKmRateISK: 615 },
  },
  '5-8': {
    day: { startFeeISK: 1050, waitPerHourISK: 17760, firstKmRateISK: 709, afterKmRateISK: 505 },
    night: { startFeeISK: 1050, waitPerHourISK: 18660, firstKmRateISK: 756, afterKmRateISK: 568 },
    holiday: { startFeeISK: 1450, waitPerHourISK: 24960, firstKmRateISK: 1042, afterKmRateISK: 800 },
  },
};

/** Pre-agreed KEF airport transfer fares (ISK), by route and passenger tier. */
export const FIXED_FARES: Record<FixedRouteId, Record<PaxTier, number>> = {
  reykjavik: { '1-4': 22500, '5-8': 29500 },
  blueLagoon: { '1-4': 12500, '5-8': 16500 },
};

/** The first distance tier ends at 4 km. */
export const FIRST_TIER_KM = 4;

/**
 * KEF airport parking / gate fee (hliðgjald, Leifsstöð). The price list states
 * 500 kr. Added only to METER trips that touch KEF — the FIXED airport fares
 * already bake it in. Centralised so a rate change is a one-line edit.
 */
export const AIRPORT_PARKING_FEE_ISK = 500;

/**
 * Fares are rounded to the nearest 100 ISK. The printed price list rounds the
 * meter to 50 ISK, but Stripe treats ISK as zero-decimal and our payments layer
 * (`toStripeAmount`) coerces ISK charge amounts to a multiple of 100. Rounding
 * to 100 here keeps the displayed, stored and charged price identical — a
 * 50-rounded fare like 11.950 would silently be charged as 12.000. The fixed
 * fares are already multiples of 100, so only the meter is affected (by ≤50 kr).
 */
export const FARE_ROUNDING_ISK = 100;

/** Day rate window: 08:00 (inclusive) – 17:00 (exclusive), weekdays only. */
const DAY_START_MINUTES = 8 * 60;
const DAY_END_MINUTES = 17 * 60;

/**
 * Icelandic public/holiday dates carrying the +35% surcharge (Stórhátíðagjald).
 * Hard-coded for 2025–2026, ported from the reference calculator. NOTE: this
 * list MUST be extended each year — there is no algorithmic source. Dates are
 * Iceland-local (UTC+0, no DST) ISO `YYYY-MM-DD`.
 */
export const HOLIDAYS: ReadonlySet<string> = new Set([
  '2025-01-01', '2025-04-17', '2025-04-18', '2025-04-21', '2025-04-24',
  '2025-05-01', '2025-05-29', '2025-06-09', '2025-06-17', '2025-08-04',
  '2025-12-24', '2025-12-25', '2025-12-26', '2025-12-31',
  '2026-01-01', '2026-04-02', '2026-04-03', '2026-04-06', '2026-04-23',
  '2026-05-01', '2026-05-14', '2026-05-25', '2026-06-17', '2026-08-03',
  '2026-12-24', '2026-12-25', '2026-12-26', '2026-12-31',
]);

/** Passenger count → rate tier. 1–4 → '1-4', 5–8 → '5-8'. */
export function getPaxTier(passengerCount: number): PaxTier {
  return passengerCount <= 4 ? '1-4' : '5-8';
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

/** Round a raw fare to the nearest chargeable ISK increment (100 ISK). */
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
  /** Total in ISK, rounded to a chargeable amount. The source of truth. */
  totalISK: number;
  pricingMode: 'meter' | 'fixed';
  /** 'fixed' for pre-agreed fares; otherwise the meter rate type that applied. */
  rateType: RateType | 'fixed';
  breakdownISK: FareBreakdownISK;
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
  /** Add the KEF gate fee (meter trips that touch the airport). */
  includeAirportFee?: boolean;
}

/** Compute a metered fare from the rate card. */
export function computeMeterFareISK(input: MeterFareInput): FareResult {
  const tier = getPaxTier(input.passengerCount);
  const rateType = getRateType(input.at);
  const rates = RATE_CARD[tier][rateType];

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
  const airportFee = input.includeAirportFee ? AIRPORT_PARKING_FEE_ISK : 0;

  const totalISK = roundFareISK(startFee + distanceFee + waitingFee + airportFee);

  return {
    totalISK,
    pricingMode: 'meter',
    rateType,
    breakdownISK: {
      startFee,
      distanceFee: Math.round(distanceFee),
      waitingFee: Math.round(waitingFee),
      airportFee,
      fixedFare: 0,
    },
  };
}

/** Compute a pre-agreed KEF airport transfer fare. */
export function computeFixedFareISK(route: FixedRouteId, passengerCount: number): FareResult {
  const tier = getPaxTier(passengerCount);
  const fixedFare = FIXED_FARES[route][tier];
  return {
    totalISK: roundFareISK(fixedFare),
    pricingMode: 'fixed',
    rateType: 'fixed',
    breakdownISK: { ...ZERO_BREAKDOWN, fixedFare },
  };
}
