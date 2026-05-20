import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { auth } from '@/lib/auth';

import { bookingsRoute } from './routes/bookings';
import { driversRoute } from './routes/drivers';
import { paymentsRoute } from './routes/payments';
import { uploadsRoute } from './routes/uploads';
import { exchangeRatesRoute } from './routes/exchange-rates';
import { stripeWebhookRoute } from './routes/webhooks/stripe';

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

app.get('/api/health', (c) =>
  c.json({ status: 'ok', version: process.env.npm_package_version ?? '0.0.0' }),
);

// Better Auth mounts its own routes
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// Feature routes
app.route('/api/bookings', bookingsRoute);
app.route('/api/drivers', driversRoute);
app.route('/api/payments', paymentsRoute);
app.route('/api/uploads', uploadsRoute);
app.route('/api/exchange-rates', exchangeRatesRoute);
app.route('/api/webhooks/stripe', stripeWebhookRoute);

export type AppType = typeof app;
