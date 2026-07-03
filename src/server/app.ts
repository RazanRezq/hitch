import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { bookingsRoute } from './routes/bookings';
import { receiptsRoute } from './routes/receipts';
import { quotesRoute } from './routes/quotes';
import { toursRoute } from './routes/tours';
import { uploadsRoute } from './routes/uploads';
import { exchangeRatesRoute } from './routes/exchange-rates';
import { feedbackRoute } from './routes/feedback';
import { fleetRoute } from './routes/fleet';
import { stripeWebhookRoute } from './routes/webhooks/stripe';
import { clerkWebhookRoute } from './routes/webhooks/clerk';
import { adminRoute } from './routes/admin';

/**
 * Bare Hono app. No transport here — Next.js mounts this via the catch-all route
 * at /api/[[...route]]/route.ts. The standalone WS runner (server/index.ts) imports
 * this same app and adds the WS upgrade + node-server transport on top.
 *
 * CORS is NOT registered here: when mounted in Next.js, both pages and API share
 * the same origin so it's unnecessary; the WS runner adds it itself.
 */
export const app = new Hono();

app.use('*', logger());

app.onError((err, c) => {
  console.error('[hono.onError]', err);
  const message = err instanceof Error ? err.message : 'Internal error';
  return c.json({ error: message, name: err instanceof Error ? err.name : 'Error' }, 500);
});

app.get('/api/health', (c) =>
  c.json({ status: 'ok', version: process.env.npm_package_version ?? '0.0.0' }),
);

// Feature routes
app.route('/api/bookings', bookingsRoute);
app.route('/api/receipts', receiptsRoute);
app.route('/api/quotes', quotesRoute);
app.route('/api/tours', toursRoute);
app.route('/api/uploads', uploadsRoute);
app.route('/api/exchange-rates', exchangeRatesRoute);
app.route('/api/complaint', feedbackRoute);
app.route('/api/fleet', fleetRoute);
app.route('/api/webhooks/stripe', stripeWebhookRoute);
app.route('/api/webhooks/clerk', clerkWebhookRoute);
app.route('/api/admin', adminRoute);

export type AppType = typeof app;
