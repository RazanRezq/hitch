import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { quoteRequestSchema } from '@/lib/types';
import { getQuote } from '@/server/services/pricing/quote';
import { ManualQuoteRequiredError } from '@/server/services/pricing';

/**
 * POST /api/quotes — public, no auth. Returns price preview in caller's chosen
 * display currency. The booking-create flow re-runs this server-side so client
 * cannot tamper with prices.
 */
export const quotesRoute = new Hono().post(
  '/',
  zValidator('json', quoteRequestSchema),
  async (c) => {
    const body = c.req.valid('json');
    try {
      const quote = await getQuote({
        pickup: { lat: body.pickup.lat, lng: body.pickup.lng },
        dropoff: { lat: body.dropoff.lat, lng: body.dropoff.lng },
        passengerCount: body.passengerCount,
        scheduledTime: body.scheduledTime,
        displayCurrency: body.displayCurrency,
        combo: body.combo,
      });
      return c.json(quote);
    } catch (err) {
      // Some trips (e.g. metered 9–16 pax) can't be auto-priced — ask for a
      // manual quote instead of failing with a 500.
      if (err instanceof ManualQuoteRequiredError) {
        return c.json(
          { error: err.message, code: err.code, manualQuoteRequired: true },
          422,
        );
      }
      throw err;
    }
  },
);
