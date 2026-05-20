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
  const perKm = Math.round(distanceKm * 380);
  const airportSurcharge = options.isAirportPickup ? 1500 : 0;
  return {
    basePriceISK: baseFare + perKm + airportSurcharge,
    distanceKm,
    breakdownISK: { baseFare, perKm, airportSurcharge },
  };
}
