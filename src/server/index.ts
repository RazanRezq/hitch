/**
 * Standalone runner — only used for the WebSocket server (and as a fallback HTTP
 * mirror of the Next.js-mounted API for tooling). Start with `npm run ws`.
 *
 * Next.js handles all browser-facing HTTP via src/app/api/[[...route]]/route.ts;
 * this process exists because Next route handlers cannot host long-lived WS
 * connections. Same Hono app, different transport.
 */
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { cors } from 'hono/cors';
import { app } from './app';
import { createWsHandler } from './realtime/ws-server';

app.use(
  '*',
  cors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);

const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app });
app.get('/ws', upgradeWebSocket(createWsHandler()));

const port = Number(process.env.WS_PORT ?? process.env.API_PORT ?? 3001);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[hitch-ws] listening on http://localhost:${info.port} (ws at /ws)`);
});
injectWebSocket(server);
