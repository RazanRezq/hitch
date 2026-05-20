import type { WSContext } from 'hono/ws';
import { subscribe, unsubscribe } from './channels';

/**
 * Minimal WS handler. On message: expects `{ action: "subscribe" | "unsubscribe", channel }`.
 * Auth + RBAC validation per channel to be added. See CLAUDE.md "REALTIME ARCHITECTURE".
 */
export function createWsHandler() {
  return () => {
    const subs = new Set<string>();
    return {
      onOpen(_evt: Event, ws: WSContext) {
        ws.send(JSON.stringify({ type: 'hello', channel: 'system', payload: { ok: true } }));
      },
      onMessage(evt: MessageEvent, ws: WSContext) {
        try {
          const msg = JSON.parse(String(evt.data)) as { action?: string; channel?: string };
          if (!msg.channel) return;
          if (msg.action === 'subscribe') {
            subs.add(msg.channel);
            subscribe(msg.channel, ws);
          } else if (msg.action === 'unsubscribe') {
            subs.delete(msg.channel);
            unsubscribe(msg.channel, ws);
          }
        } catch {
          /* ignore malformed frames */
        }
      },
      onClose(_evt: CloseEvent, ws: WSContext) {
        for (const channel of subs) unsubscribe(channel, ws);
        subs.clear();
      },
    };
  };
}
