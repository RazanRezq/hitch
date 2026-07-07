import { PartySocket } from 'partysocket';
import type { DriverLocationFrame } from '@/lib/types';

/** WebSocket.OPEN readyState — local const so module eval never touches the global (SSR-safe). */
const WS_OPEN = 1;

export type WsMessage =
  | { action: 'subscribe'; channel: string; token?: string }
  | { action: 'unsubscribe'; channel: string }
  // Driver GPS frames (see server/realtime/location-ingest.ts).
  | DriverLocationFrame
  | { action: 'offline' }
  | { type: string; channel: string; payload: unknown };

export interface WsClientOptions {
  url?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;
}

function resolveWsUrl(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  return 'ws://localhost:3001/ws';
}

export class HitchWsClient {
  private socket: PartySocket;
  private handlers = new Map<string, Set<(payload: unknown) => void>>();
  // Per-channel guest token, retained so subscriptions can be replayed on reconnect.
  private tokens = new Map<string, string>();

  constructor(options: WsClientOptions = {}) {
    const url = new URL(resolveWsUrl(options.url));
    // Use basePath (not room): partysocket builds `${host}/${basePath}`, matching the
    // server's literal `/ws` route. With `room` it would inject `/parties/<party>/<room>`,
    // which the Hono WS server does not serve.
    this.socket = new PartySocket({
      host: url.host,
      basePath: url.pathname.replace(/^\//, '') || 'ws',
      protocol: url.protocol === 'wss:' ? 'wss' : 'ws',
    });

    this.socket.addEventListener('open', () => {
      // A reconnect gives us a fresh server socket with no subscriptions —
      // replay every active channel so realtime survives drops.
      for (const channel of this.handlers.keys()) this.sendSubscribe(channel);
      options.onOpen?.();
    });
    this.socket.addEventListener('close', () => options.onClose?.());
    this.socket.addEventListener('error', (e) => options.onError?.(e));
    this.socket.addEventListener('message', (event) => this.dispatch(event.data));
  }

  subscribe(
    channel: string,
    handler: (payload: unknown) => void,
    token?: string,
  ): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      if (token) this.tokens.set(channel, token);
      // Subscribe now if already connected; otherwise the 'open' handler replays it.
      if (this.socket.readyState === WS_OPEN) this.sendSubscribe(channel);
    }
    this.handlers.get(channel)!.add(handler);

    return () => {
      const set = this.handlers.get(channel);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(channel);
        this.tokens.delete(channel);
        this.send({ action: 'unsubscribe', channel });
      }
    };
  }

  /**
   * Push a client→server frame outside the subscribe protocol (driver GPS).
   * Best-effort: a frame sent while the socket is down is simply dropped — the
   * next interval frame makes it, and the server treats gaps as harmless.
   */
  push(msg: WsMessage): void {
    try {
      this.send(msg);
    } catch {
      /* socket closed mid-send — ignore */
    }
  }

  private sendSubscribe(channel: string): void {
    const token = this.tokens.get(channel);
    this.send({ action: 'subscribe', channel, ...(token ? { token } : {}) });
  }

  private send(msg: WsMessage): void {
    this.socket.send(JSON.stringify(msg));
  }

  private dispatch(data: unknown): void {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed && typeof parsed === 'object' && 'channel' in parsed) {
        const channel = String((parsed as { channel: string }).channel);
        const handlers = this.handlers.get(channel);
        handlers?.forEach((h) => h((parsed as { payload?: unknown }).payload ?? parsed));
      }
    } catch {
      /* ignore non-JSON frames */
    }
  }

  close(): void {
    this.socket.close();
  }
}
