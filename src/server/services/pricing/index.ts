import type { GeoCoord } from '@/lib/utils';
import { calculateDistance } from '@/lib/utils';

export interface PricingQuote {
  basePriceISK: number;
  distanceKm: number;
  breakdownISK: {
    baseFare: number;
    perKm: number;
    airportSurcharge: number;
  };
}

/** Placeholder quote calc. Replace with PricingZone-aware implementation. */
export async function quoteISK(
  pickup: GeoCoord,
  dropoff: GeoCoord,
  options: { isAirportPickup?: boolean } = {},
): Promise<PricingQuote> {
  const distanceKm = calculateDistance(pickup, dropoff);
  const baseFare = 2500;
  const airportSurcharge = options.isAirportPickup ? 1500 : 0;
  // ISK is zero-decimal and Stripe requires ISK charge amounts to be divisible
  // by 100. Round the fare to the nearest 100 ISK so the displayed, stored, and
  // charged price all agree and are chargeable. The per-km line absorbs the
  // rounding so the breakdown still sums exactly to the total.
  const rawTotal = baseFare + Math.round(distanceKm * 380) + airportSurcharge;
  const basePriceISK = Math.round(rawTotal / 100) * 100;
  const perKm = basePriceISK - baseFare - airportSurcharge;
  return {
    basePriceISK,
    distanceKm,
    breakdownISK: { baseFare, perKm, airportSurcharge },
  };
}
