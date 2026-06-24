import { z } from 'zod';
import { geoPointSchema, vehicleTypeSchema } from './bookingSchema';

export const quoteRequestSchema = z.object({
  pickup: geoPointSchema,
  dropoff: geoPointSchema,
  vehicleType: vehicleTypeSchema.optional(),
  passengerCount: z.number().int().min(1).max(8).optional(),
  scheduledTime: z.coerce.date().optional(),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']).optional(),
});
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const quoteResponseSchema = z.object({
  basePriceISK: z.number().int().nonnegative(),
  distanceKm: z.number().nonnegative(),
  distanceSource: z.enum(['road', 'straight-line']),
  isAirportTrip: z.boolean(),
  pricingMode: z.enum(['meter', 'fixed']),
  rateType: z.enum(['day', 'night', 'holiday', 'fixed']),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']),
  displayPrice: z.number().int().nonnegative(),
  exchangeRate: z.number().positive(),
  breakdownISK: z.object({
    startFee: z.number().int().nonnegative(),
    distanceFee: z.number().int().nonnegative(),
    waitingFee: z.number().int().nonnegative(),
    airportFee: z.number().int().nonnegative(),
    fixedFare: z.number().int().nonnegative(),
  }),
});
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
