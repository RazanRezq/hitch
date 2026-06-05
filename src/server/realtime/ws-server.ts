import type { Context } from 'hono';
import type { WSContext } from 'hono/ws';
import { subscribe, unsubscribe } from './channels';
import { loadWsAuth, authorizeChannel, type WsAuth } from './authorize';

/**
 * WS handler with per-channel RBAC on subscribe.
 *
 * The connection's identity is resolved once from the handshake cookies
 * (Better Auth session) and cached for the socket's lifetime. Each subscribe is
 * authorized via `authorizeChannel`; unauthenticated passengers may pass a
 * per-booking guest token in the subscribe frame. Denied subscriptions get an
 * `error` frame and are not added to any channel. See CLAUDE.md "REALTIME".
 */
export function createWsHandler() {
  return (c: Context) => {
    const subs = new Set<string>();
    // Resolve identity lazily and once — reused across every subscribe.
    let authPromise: Promise<WsAuth> | undefined;
    const getAuth = () => (authPromise ??= loadWsAuth(c.req.raw.headers));

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
      },
    };
  };
}
