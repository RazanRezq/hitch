import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { auth } from '@hitch/auth';

import { bookingsRoute } from './routes/bookings.js';
import { driversRoute } from './routes/drivers.js';
import { paymentsRoute } from './routes/payments.js';
import { uploadsRoute } from './routes/uploads.js';
import { exchangeRatesRoute } from './routes/exchange-rates.js';
import { stripeWebhookRoute } from './routes/webhooks/stripe.js';
import { createWsHandler } from './realtime/ws-server.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: [
      process.env.NEXT_PUBLIC_PASSENGER_URL ?? 'http://localhost:3000',
      process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3002',
    ],
    credentials: true,
  }),
);

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

// WebSocket
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
app.get('/ws', upgradeWebSocket(createWsHandler()));

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[hitch-api] listening on http://localhost:${info.port}`);
});
injectWebSocket(server);

export type AppType = typeof app;
