import { z } from 'zod';
import { TOUR_IDS } from '../constants';

/** Valid sightseeing tour IDs (shared with the pricing config). */
export const tourIdSchema = z.enum(TOUR_IDS);

export const tourQuoteRequestSchema = z.object({
  tourId: tourIdSchema,
  // Tours are priced per car for 1–8 passengers; 9–16 needs a manual quote.
  passengerCount: z.number().int().min(1).max(16).optional(),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']).optional(),
});
export type TourQuoteRequestInput = z.infer<typeof tourQuoteRequestSchema>;

export const tourQuoteResponseSchema = z.object({
  tourId: tourIdSchema,
  paxTier: z.enum(['1-4', '5-8']),
  basePriceISK: z.number().int().nonnegative(),
  displayCurrency: z.enum(['ISK', 'EUR', 'USD']),
  displayPrice: z.number().int().nonnegative(),
  exchangeRate: z.number().positive(),
});
export type TourQuoteResponse = z.infer<typeof tourQuoteResponseSchema>;

const tourPriceByCurrencySchema = z.object({
  ISK: z.number().nonnegative(),
  EUR: z.number().nonnegative(),
  USD: z.number().nonnegative(),
});

export const tourCatalogEntrySchema = z.object({
  tourId: tourIdSchema,
  pricesByTier: z.object({
    '1-4': tourPriceByCurrencySchema,
    '5-8': tourPriceByCurrencySchema,
  }),
});
export const tourCatalogResponseSchema = z.object({
  tours: z.array(tourCatalogEntrySchema),
});
export type TourCatalogResponse = z.infer<typeof tourCatalogResponseSchema>;
