import { PartySocket } from 'partysocket';

export type WsMessage =
  | { action: 'subscribe'; channel: string }
  | { action: 'unsubscribe'; channel: string }
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

  constructor(options: WsClientOptions = {}) {
    const url = new URL(resolveWsUrl(options.url));
    this.socket = new PartySocket({
      host: url.host,
      room: url.pathname.replace(/^\//, '') || 'ws',
      protocol: url.protocol === 'wss:' ? 'wss' : 'ws',
    });

    this.socket.addEventListener('open', () => options.onOpen?.());
    this.socket.addEventListener('close', () => options.onClose?.());
    this.socket.addEventListener('error', (e) => options.onError?.(e));
    this.socket.addEventListener('message', (event) => this.dispatch(event.data));
  }

  subscribe(channel: string, handler: (payload: unknown) => void): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      this.send({ action: 'subscribe', channel });
    }
    this.handlers.get(channel)!.add(handler);

    return () => {
      const set = this.handlers.get(channel);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(channel);
        this.send({ action: 'unsubscribe', channel });
      }
    };
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
