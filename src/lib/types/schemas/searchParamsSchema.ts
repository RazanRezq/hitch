import { z } from 'zod';
import { geoPointSchema, vehicleTypeSchema } from './bookingSchema';

export const searchParamsSchema = z.object({
  pickup: geoPointSchema,
  dropoff: geoPointSchema,
  scheduledTime: z.coerce.date(),
  passengerCount: z.number().int().min(1).max(8).default(1),
  vehicleTypeRequested: vehicleTypeSchema.optional(),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']).default('ISK'),
});
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
