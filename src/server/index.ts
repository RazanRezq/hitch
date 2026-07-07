/**
 * Standalone runner — only used for the WebSocket server (and as a fallback HTTP
 * mirror of the Next.js-mounted API for tooling). Start with `npm run ws`.
 *
 * Next.js handles all browser-facing HTTP via src/app/api/[[...route]]/route.ts;
 * this process exists because Next route handlers cannot host long-lived WS
 * connections. Same Hono app, different transport.
 */
import { initSentry } from './lib/sentry';
initSentry('ws'); // before anything else can throw

import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { cors } from 'hono/cors';
import { app } from './app';
import { createWsHandler } from './realtime/ws-server';
import { initRedisPubSub } from './realtime/redis-pubsub';

app.use(
  '*',
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
app.get('/ws', upgradeWebSocket(createWsHandler()));

// Railway (and most PaaS) inject PORT and route the public domain to it; we must
// bind that. WS_PORT/API_PORT stay as explicit overrides; 3001 is the local default.
const port = Number(process.env.WS_PORT ?? process.env.API_PORT ?? process.env.PORT ?? 3001);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[hitch-ws] listening on http://localhost:${info.port} (ws at /ws)`);
});
injectWebSocket(server);

// Bridge Redis pub/sub → local WS channels so booking/dispatch events published
// from other processes (Next.js API routes, BullMQ workers) fan out to the
// sockets connected to THIS instance. Required for the realtime loop to close.
void initRedisPubSub().catch((err) =>
  console.error('[hitch-ws] redis pub/sub init failed', err),
);
