import type { WSContext } from 'hono/ws';

const channels = new Map<string, Set<WSContext>>();

export function subscribe(channel: string, ws: WSContext): void {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel)!.add(ws);
}

export function unsubscribe(channel: string, ws: WSContext): void {
  const set = channels.get(channel);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) channels.delete(channel);
}

export function publish(channel: string, payload: unknown): void {
  const set = channels.get(channel);
  if (!set) return;
  const data = JSON.stringify({ type: 'event', channel, payload });
  for (const ws of set) {
    try {
      ws.send(data);
    } catch {
      /* connection dropped — pruned on next close */
    }
  }
}
