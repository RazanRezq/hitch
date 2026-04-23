import { redis } from '../lib/redis.js';
import { publish } from './channels.js';

/**
 * Bridges Redis pub/sub → local WS channels so horizontal scaling works. Each
 * API instance subscribes to the same Redis channels and fans out to its own
 * connected sockets. See CLAUDE.md "REALTIME ARCHITECTURE".
 */
export async function initRedisPubSub(): Promise<void> {
  const sub = redis.duplicate();
  await sub.psubscribe('hitch:*');
  sub.on('pmessage', (_pattern, channel, message) => {
    const localChannel = channel.replace(/^hitch:/, '');
    try {
      publish(localChannel, JSON.parse(message));
    } catch {
      publish(localChannel, message);
    }
  });
}

export async function publishToRedis(channel: string, payload: unknown): Promise<void> {
  await redis.publish(`hitch:${channel}`, JSON.stringify(payload));
}
