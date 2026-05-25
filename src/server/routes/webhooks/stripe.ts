import { Hono } from 'hono';
import { prisma } from '@/lib/db';
import { stripe } from '@/server/lib/stripe';
import { webhooksQueue } from '@/server/queues/webhooks';

function getSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return s;
}

/**
 * Webhook outbox pattern (CLAUDE.md "Webhook Outbox Pattern"): verify the
 * Stripe signature, persist the event to WebhookEvent (deduping by Stripe
 * event.id), enqueue a BullMQ job, and return 200 within ms. The worker
 * applies the booking state transition asynchronously.
 *
 * IMPORTANT: this handler reads the RAW request body before any JSON parsing
 * so the signature check matches Stripe's hash exactly.
 */
export const stripeWebhookRoute = new Hono().post('/', async (c) => {
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'Missing stripe-signature header' }, 400);

  const rawBody = await c.req.raw.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, getSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.warn('[stripe-webhook] signature verification failed', message);
    return c.json({ error: `Invalid signature: ${message}` }, 400);
  }

  // Stripe may redeliver the same event — dedupe by externalId.
  const existing = await prisma.webhookEvent.findUnique({
    where: { externalId: event.id },
  });
  if (existing) {
    return c.json({ received: true, duplicate: true });
  }

  const record = await prisma.webhookEvent.create({
    data: {
      source: 'stripe',
      externalId: event.id,
      type: event.type,
      payload: JSON.parse(rawBody),
      status: 'pending',
    },
  });

  await webhooksQueue.add(
    'process',
    { webhookEventId: record.id },
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );

  return c.json({ received: true });
});
