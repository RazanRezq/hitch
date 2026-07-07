import type { Context } from 'hono';
import type { WSContext } from 'hono/ws';
import { subscribe, unsubscribe } from './channels';
import { loadWsAuth, authorizeChannel, type WsAuth } from './authorize';
import { DriverLocationIngest } from './location-ingest';

/**
 * WS handler with per-channel RBAC on subscribe, plus driver GPS ingest.
 *
 * The connection's identity is resolved once from the handshake cookies (Clerk
 * session) and cached for the socket's lifetime. Each subscribe is authorized
 * via `authorizeChannel`; unauthenticated passengers may pass a per-booking
 * guest token in the subscribe frame. Denied subscriptions get an `error` frame
 * and are not added to any channel. Driver connections additionally push
 * `location` / `offline` frames, handled by DriverLocationIngest.
 * See CLAUDE.md "REALTIME".
 */
export function createWsHandler() {
  return (c: Context) => {
    const subs = new Set<string>();
    // Resolve identity lazily and once — reused across every subscribe.
    let authPromise: Promise<WsAuth> | undefined;
    const getAuth = () => (authPromise ??= loadWsAuth(c.req.raw));
    const ingest = new DriverLocationIngest(getAuth);

    return {
      onOpen(_evt: Event, ws: WSContext) {
        ws.send(JSON.stringify({ type: 'hello', channel: 'system', payload: { ok: true } }));
        void getAuth(); // warm the session lookup
      },
      async onMessage(evt: MessageEvent, ws: WSContext) {
        let msg: { action?: string; channel?: string; token?: string };
        try {
          msg = JSON.parse(String(evt.data));
        } catch {
          return; // ignore malformed frames
        }

        // Driver GPS frames carry no channel — route them before the channel check.
        // Both handlers are fire-and-forget-safe (they never throw).
        if (msg.action === 'location') {
          void ingest.handleLocation(msg);
          return;
        }
        if (msg.action === 'offline') {
          void ingest.setOffline();
          return;
        }
        if (!msg.channel) return;

        if (msg.action === 'subscribe') {
          const auth = await getAuth();
          const allowed = await authorizeChannel(msg.channel, auth, msg.token);
          if (!allowed) {
            ws.send(
              JSON.stringify({
                type: 'error',
                channel: msg.channel,
                payload: { error: 'forbidden' },
              }),
            );
            return;
          }
          subs.add(msg.channel);
          subscribe(msg.channel, ws);
        } else if (msg.action === 'unsubscribe') {
          subs.delete(msg.channel);
          unsubscribe(msg.channel, ws);
        }
      },
      onClose(_evt: CloseEvent, ws: WSContext) {
        for (const channel of subs) unsubscribe(channel, ws);
        subs.clear();
        void ingest.handleClose();
      },
    };
  };
}
