import { Hono } from 'hono';

/**
 * Webhook outbox pattern: write to webhook_events, return 200 immediately,
 * process in BullMQ worker. See CLAUDE.md "Webhook Outbox Pattern".
 */
export const stripeWebhookRoute = new Hono().post('/', (c) =>
  c.json({ error: 'Not implemented' }, 501),
);
