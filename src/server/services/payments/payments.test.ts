import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Stripe client so we assert the CALLS (manual capture, idempotency,
// ISK rounding) without touching the network. These are flow-mechanics tests —
// they intentionally do not assert specific fare amounts.
const h = vi.hoisted(() => ({
  create: vi.fn(),
  capture: vi.fn(),
  cancel: vi.fn(),
  refundCreate: vi.fn(),
}));

vi.mock('@/server/lib/stripe', () => ({
  stripe: {
    paymentIntents: { create: h.create, capture: h.capture, cancel: h.cancel },
    refunds: { create: h.refundCreate },
  },
}));

import {
  createPaymentIntent,
  capturePaymentIntent,
  voidPaymentIntent,
  refundPaymentIntent,
} from './index';

beforeEach(() => {
  vi.clearAllMocks();
  h.create.mockResolvedValue({ id: 'pi_test', client_secret: 'cs_test' });
  h.capture.mockResolvedValue({ id: 'pi_test', status: 'succeeded' });
  h.cancel.mockResolvedValue({ id: 'pi_test', status: 'canceled' });
  h.refundCreate.mockResolvedValue({ id: 're_test', status: 'succeeded' });
});

describe('createPaymentIntent', () => {
  it('always uses manual capture and forwards the idempotency key', async () => {
    await createPaymentIntent({
      amount: 13900,
      currency: 'ISK',
      customerId: 'cus_1',
      metadata: { bookingId: 'bk_1' },
      idempotencyKey: 'booking:bk_1:intent',
    });

    expect(h.create).toHaveBeenCalledTimes(1);
    const [params, options] = h.create.mock.calls[0];
    expect(params.capture_method).toBe('manual');
    expect(params.currency).toBe('isk'); // lowercased for Stripe
    expect(params.customer).toBe('cus_1');
    expect(options).toEqual({ idempotencyKey: 'booking:bk_1:intent' });
  });

  it('coerces ISK amounts to be divisible by 100 (Stripe zero-decimal rule)', async () => {
    await createPaymentIntent({ amount: 13950, currency: 'ISK', idempotencyKey: 'k' });
    expect(h.create.mock.calls[0][0].amount).toBe(14000);

    h.create.mockClear();
    await createPaymentIntent({ amount: 13949, currency: 'ISK', idempotencyKey: 'k' });
    expect(h.create.mock.calls[0][0].amount).toBe(13900);
  });

  it('passes EUR/USD minor-unit amounts through untouched', async () => {
    await createPaymentIntent({ amount: 8950, currency: 'EUR', idempotencyKey: 'k' });
    const params = h.create.mock.calls[0][0];
    expect(params.amount).toBe(8950);
    expect(params.currency).toBe('eur');
  });
});

describe('capturePaymentIntent', () => {
  it('captures by intent id with an idempotency key', async () => {
    await capturePaymentIntent({ intentId: 'pi_1', idempotencyKey: 'assign:bk_1:capture' });
    expect(h.capture).toHaveBeenCalledWith(
      'pi_1',
      {},
      { idempotencyKey: 'assign:bk_1:capture' },
    );
  });

  it('supports a partial capture amount', async () => {
    await capturePaymentIntent({ intentId: 'pi_1', idempotencyKey: 'k', amountToCapture: 5000 });
    expect(h.capture).toHaveBeenCalledWith(
      'pi_1',
      { amount_to_capture: 5000 },
      { idempotencyKey: 'k' },
    );
  });
});

describe('voidPaymentIntent', () => {
  it('cancels the intent with an idempotency key', async () => {
    await voidPaymentIntent({ intentId: 'pi_1', idempotencyKey: 'status:bk_1:void' });
    expect(h.cancel).toHaveBeenCalledWith(
      'pi_1',
      undefined,
      { idempotencyKey: 'status:bk_1:void' },
    );
  });
});

describe('refundPaymentIntent', () => {
  it('refunds the full intent with an idempotency key', async () => {
    await refundPaymentIntent({ intentId: 'pi_1', idempotencyKey: 'refund:bk_1:full' });
    expect(h.refundCreate).toHaveBeenCalledWith(
      { payment_intent: 'pi_1' },
      { idempotencyKey: 'refund:bk_1:full' },
    );
  });

  it('supports a partial refund amount in minor units', async () => {
    await refundPaymentIntent({ intentId: 'pi_1', idempotencyKey: 'k', amount: 5000 });
    expect(h.refundCreate).toHaveBeenCalledWith(
      { payment_intent: 'pi_1', amount: 5000 },
      { idempotencyKey: 'k' },
    );
  });
});
