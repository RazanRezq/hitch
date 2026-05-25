import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { quoteRequestSchema } from '@/lib/types';
import { getQuote } from '@/server/services/pricing/quote';

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
    const quote = await getQuote({
      pickup: { lat: body.pickup.lat, lng: body.pickup.lng },
      dropoff: { lat: body.dropoff.lat, lng: body.dropoff.lng },
      displayCurrency: body.displayCurrency,
    });
    return c.json(quote);
  },
);
