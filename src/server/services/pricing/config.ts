/**
 * Hitch pricing config — THE single editable source of truth for every fare
 * number. Nothing in the pricing engine should inline a rate; it all lives here
 * (see CLAUDE.md "No Inline Hardcoded Values" + the pricing spec guardrails).
 *
 * Two pricing models:
 *  - FIXED  — airport / Blue Lagoon / Port transfers, the combo, tours. Looked
 *             up by route + passenger tier, explicit price PER CURRENCY (the
 *             client hand-rounds them, so we do NOT auto-convert).
 *  - METER  — in-city / immediate / off-list. start + tiered distance + waiting,
 *             by time tier + passenger tier, rounded to nearest 50 ISK. EUR/USD
 *             display uses FIXED constants (NOT live FX).
 *
 * ISK is the base/source of truth. Customer-facing FX is fixed (150/130), never
 * the live exchange-rate worker (that worker is now internal/accounting only).
 */

import type { Currency, TourId } from '@/lib/types';

export type { TourId };

export type MeterPaxTier = '1-4' | '5-8';
export type FixedPaxTier = '1-4' | '5-8' | '9-16';
export type RateType = 'day' | 'night' | 'holiday';
export type FixedRouteId = 'reykjavik' | 'blueLagoon';

// ─────────────────────────────────────────────────────────────────────────────
// Rounding, fees, thresholds
// ─────────────────────────────────────────────────────────────────────────────

/** The meter ticks every 50 ISK — round the final metered total to nearest 50. */
export const FARE_ROUNDING_ISK = 50;

/** The first distance tier ends at 4 km (higher per-km rate within it). */
export const FIRST_TIER_KM = 4;

/**
 * KEF airport gate fee (hliðgjald, Leifsstöð). Added ONLY when a trip
 * ORIGINATES at KEF. Client-confirmed at 490 ISK (matches Hreyfill).
 */
export const AIRPORT_FEE_ISK = 490;

/**
 * Whether the airport gate fee stacks on top of a FIXED pre-agreed fare. Client
 * confirmed TRUE — it is additive, keyed strictly on trip ORIGIN = KEF. So
 * Airport→Reykjavík and the combo get +490; Reykjavík→KEF (ends at KEF) does
 * NOT, per the literal "originates at KEF" rule.
 *
 * NOTE for the client: this is asymmetric — the return leg still drives into the
 * airport but isn't charged the gate fee. Flip the call site to symmetric
 * (touches KEF either end) if that's preferred.
 */
export const AIRPORT_FEE_APPLIES_TO_FIXED = true;

/**
 * Customer-facing FX for METER fares: ISK per 1 unit of currency.
 * EUR = ISK / 150, USD = ISK / 130. Fixed constants, never live rates.
 */
export const METER_FX_ISK_PER_UNIT: Record<Exclude<Currency, 'ISK'>, number> = {
  EUR: 150,
  USD: 130,
};

/** Tours are EUR-native; ISK = EUR × 150. */
export const TOUR_EUR_TO_ISK = 150;

/** Off-list distance threshold. Beyond it, a per-km surcharge applies. */
export const OFF_LIST_DISTANCE_THRESHOLD_KM = 100;

/**
 * Per-km surcharge above the off-list threshold: 2.50 EUR/km.
 * PENDING (flagged): whether this is billed in EUR or as an ISK equivalent
 * (≈ 375 kr at 150). Implemented as the ISK equivalent so basePriceISK stays
 * the source of truth — `OFF_LIST_SURCHARGE_ISK_PER_KM` below.
 */
export const OFF_LIST_EUR_PER_KM_OVER_THRESHOLD = 2.5;
export const OFF_LIST_SURCHARGE_ISK_PER_KM =
  OFF_LIST_EUR_PER_KM_OVER_THRESHOLD * TOUR_EUR_TO_ISK; // 375 ISK/km

// ─────────────────────────────────────────────────────────────────────────────
// METER rate card (1-4 and 5-8 only). A metered trip needing 9-16 → manual quote.
// [start, waitingPerHour, perKm_first4km, perKm_after4km] — all ISK.
// ─────────────────────────────────────────────────────────────────────────────

export interface RateCardEntry {
  startFeeISK: number;
  waitPerHourISK: number;
  firstKmRateISK: number;
  afterKmRateISK: number;
}

export const RATE_CARD: Record<MeterPaxTier, Record<RateType, RateCardEntry>> = {
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

// ─────────────────────────────────────────────────────────────────────────────
// FIXED fares — explicit price PER CURRENCY per tier (no auto-conversion).
// Reverse direction (→ KEF) uses the same fares.
// ─────────────────────────────────────────────────────────────────────────────

export const FIXED_FARES: Record<FixedRouteId, Record<FixedPaxTier, Record<Currency, number>>> = {
  reykjavik: {
    '1-4': { ISK: 22500, EUR: 150, USD: 170 },
    '5-8': { ISK: 29250, EUR: 195, USD: 220 },
    '9-16': { ISK: 58500, EUR: 390, USD: 440 },
  },
  blueLagoon: {
    '1-4': { ISK: 12500, EUR: 85, USD: 100 },
    '5-8': { ISK: 16500, EUR: 110, USD: 130 },
    '9-16': { ISK: 33000, EUR: 220, USD: 260 },
  },
};

/**
 * Airport → Blue Lagoon → Reykjavík combo (~3h). Only the 1-4 ISK price is
 * known; EUR/USD and the 5-8 / 9-16 tiers are PENDING. We store ONLY what the
 * client gave (ISK 41600) and never invent the missing per-currency values —
 * a `Partial` currency map makes the gaps explicit.
 */
export const COMBO_FARES: Record<FixedPaxTier, Partial<Record<Currency, number>> | null> = {
  '1-4': { ISK: 41600 }, // EUR/USD TBC
  '5-8': null, // TBC
  '9-16': null, // TBC
};

/**
 * Port (cruise) transfers. PRICES TBC — placeholders are null so the engine
 * never auto-prices them. Do NOT guess.
 */
export const PORT_FARES: Record<
  'airport' | 'blueLagoon',
  Record<FixedPaxTier, Partial<Record<Currency, number>> | null>
> = {
  airport: { '1-4': null, '5-8': null, '9-16': null },
  blueLagoon: { '1-4': null, '5-8': null, '9-16': null },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOURS — EUR-native, per car, by tier [1-4, 5-8]. Manual/booked, never
// auto-dispatched. The tours sheet's airport/Blue-Lagoon EUR entries are
// SUPERSEDED by the FIXED_FARES above — not duplicated here.
// ─────────────────────────────────────────────────────────────────────────────

export const TOUR_FARES_EUR: Record<TourId, { '1-4': number; '5-8': number }> = {
  'golden-circle': { '1-4': 720, '5-8': 930 },
  'south-coast': { '1-4': 1045, '5-8': 1360 },
  'silver-circle': { '1-4': 650, '5-8': 860 },
  snaefellsnes: { '1-4': 1360, '5-8': 1490 },
  reykjanes: { '1-4': 500, '5-8': 650 },
  'reykjavik-sightseeing-2h': { '1-4': 195, '5-8': 255 },
  'city-center': { '1-4': 30, '5-8': 40 },
  'hvammsvik-one-way': { '1-4': 210, '5-8': 275 },
  'hvammsvik-return-4h': { '1-4': 520, '5-8': 680 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Time tiers
// ─────────────────────────────────────────────────────────────────────────────

/** Day rate window: 08:00 (inclusive) – 17:00 (exclusive), weekdays only. */
export const DAY_START_MINUTES = 8 * 60;
export const DAY_END_MINUTES = 17 * 60;

/**
 * Icelandic holiday dates carrying the +35% surcharge (Stórhátíðagjald).
 * Hard-coded 2025–2026 — MUST be extended each year (no algorithmic source).
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

// ─────────────────────────────────────────────────────────────────────────────
// Zones — the "Reykjavík flat fare" applies ONLY to postal codes 101–109.
// Greater-Reykjavík codes (110, 112, 113, 116, 170, 200…) fall to the meter.
// Used by the postal-code zone resolver (see services/geo zone lookup).
// ─────────────────────────────────────────────────────────────────────────────

export const REYKJAVIK_FLAT_FARE_POSTAL_CODES: readonly number[] = [
  101, 102, 103, 104, 105, 106, 107, 108, 109,
];
