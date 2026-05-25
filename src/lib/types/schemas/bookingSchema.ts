import { z } from 'zod';

export const geoPointSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  address: z.string().min(1).max(512),
});
export type GeoPointInput = z.infer<typeof geoPointSchema>;

export const vehicleTypeSchema = z.enum(['SEDAN', 'SUV', 'VAN']);

export const guestDetailsSchema = z.object({
  email: z.string().email().max(254),
  phone: z.string().min(5).max(30),
  name: z.string().min(1).max(120),
});
export type GuestDetailsInput = z.infer<typeof guestDetailsSchema>;

export const createBookingSchema = z.object({
  pickup: geoPointSchema,
  dropoff: geoPointSchema,
  pickupAirportCode: z.string().length(3).optional(),
  flightNumber: z
    .string()
    .regex(/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i)
    .optional(),
  scheduledTime: z.coerce.date(),
  vehicleTypeRequested: vehicleTypeSchema,
  passengerCount: z.number().int().min(1).max(8),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']).optional(),
  promoCode: z.string().max(40).optional(),
  guest: guestDetailsSchema.optional(),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.string(),
  reason: z.string().max(500).optional(),
});
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
