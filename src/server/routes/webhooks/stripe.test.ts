import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  add: vi.fn(),
}));

vi.mock('@/server/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent: h.constructEvent } },
}));
vi.mock('@/lib/db', () => ({
  prisma: { webhookEvent: { findUnique: h.findUnique, create: h.create } },
}));
vi.mock('@/server/queues/webhooks', () => ({ webhooksQueue: { add: h.add } }));

import { stripeWebhookRoute } from './stripe';

beforeAll(() => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

beforeEach(() => {
  vi.clearAllMocks();
});

function postRaw(body: string, headers: Record<string, string>) {
  return stripeWebhookRoute.request('/', { method: 'POST', body, headers });
}

describe('stripe webhook outbox route', () => {
  it('rejects a request with no signature header', async () => {
    const res = await postRaw('{}', {});
    expect(res.status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid signature without writing or enqueuing', async () => {
    h.constructEvent.mockImplementation(() => {
      throw new Error('bad sig');
    });
    const res = await postRaw('{}', { 'stripe-signature': 'sig' });
    expect(res.status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
    expect(h.add).not.toHaveBeenCalled();
  });

  it('persists a pending outbox row and enqueues a job for a new event', async () => {
    h.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.amount_capturable_updated',
    });
    h.findUnique.mockResolvedValue(null);
    h.create.mockResolvedValue({ id: 'whe_1' });
    h.add.mockResolvedValue(undefined);

    const res = await postRaw(JSON.stringify({ id: 'evt_1' }), { 'stripe-signature': 'sig' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });

    expect(h.create).toHaveBeenCalledTimes(1);
    expect(h.create.mock.calls[0][0].data).toMatchObject({
      source: 'stripe',
      externalId: 'evt_1',
      type: 'payment_intent.amount_capturable_updated',
      status: 'pending',
    });

    expect(h.add).toHaveBeenCalledTimes(1);
    const [jobName, jobData] = h.add.mock.calls[0];
    expect(jobName).toBe('process');
    expect(jobData).toEqual({ webhookEventId: 'whe_1' });
  });

  it('dedupes a redelivered event without re-enqueuing', async () => {
    h.constructEvent.mockReturnValue({ id: 'evt_dup', type: 'payment_intent.canceled' });
    h.findUnique.mockResolvedValue({ id: 'whe_existing', externalId: 'evt_dup' });

    const res = await postRaw(JSON.stringify({ id: 'evt_dup' }), { 'stripe-signature': 'sig' });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, duplicate: true });
    expect(h.create).not.toHaveBeenCalled();
    expect(h.add).not.toHaveBeenCalled();
  });
});
