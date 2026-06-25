import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { tourQuoteRequestSchema } from '@/lib/types';
import { ManualQuoteRequiredError, getTourQuote, listTours } from '@/server/services/pricing';

/**
 * Tours API — public, no auth. The sightseeing catalog and its per-currency
 * prices (see hitch-docs/Tours.pdf). Tours are manual/booked and never
 * auto-dispatched, so there is no booking-create flow here yet.
 *
 *  GET  /api/tours        → the price catalog (all tours, both tiers, all currencies)
 *  POST /api/tours/quote  → price one tour in the caller's display currency
 */
export const toursRoute = new Hono()
  .get('/', (c) => c.json({ tours: listTours() }))
  .post('/quote', zValidator('json', tourQuoteRequestSchema), (c) => {
    const body = c.req.valid('json');
    try {
      return c.json(
        getTourQuote({
          tourId: body.tourId,
          passengerCount: body.passengerCount,
          displayCurrency: body.displayCurrency,
        }),
      );
    } catch (err) {
      // 9–16 groups have no list price — ask for a manual quote, don't 500.
      if (err instanceof ManualQuoteRequiredError) {
        return c.json({ error: err.message, code: err.code, manualQuoteRequired: true }, 422);
      }
      throw err;
    }
  });
