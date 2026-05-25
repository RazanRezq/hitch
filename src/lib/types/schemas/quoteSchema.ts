import { z } from 'zod';
import { geoPointSchema, vehicleTypeSchema } from './bookingSchema';

export const quoteRequestSchema = z.object({
  pickup: geoPointSchema,
  dropoff: geoPointSchema,
  vehicleType: vehicleTypeSchema.optional(),
  scheduledTime: z.coerce.date().optional(),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']).optional(),
});
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

export const quoteResponseSchema = z.object({
  basePriceISK: z.number().int().nonnegative(),
  distanceKm: z.number().nonnegative(),
  isAirportTrip: z.boolean(),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']),
  displayPrice: z.number().int().nonnegative(),
  exchangeRate: z.number().positive(),
  breakdownISK: z.object({
    baseFare: z.number().int().nonnegative(),
    perKm: z.number().int().nonnegative(),
    airportSurcharge: z.number().int().nonnegative(),
  }),
});
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
