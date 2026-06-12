import { stripe } from '../../lib/stripe';

/**
 * Coerce an amount to a value Stripe will accept for the currency. Stripe treats
 * ISK as effectively zero-decimal — charge amounts must be divisible by 100.
 * Pricing already rounds ISK to the nearest 100; this is a safety net so no
 * caller can ever fail PaymentIntent creation with a stray ISK amount.
 */
function toStripeAmount(amount: number, currency: 'ISK' | 'EUR' | 'USD'): number {
  if (currency === 'ISK') return Math.round(amount / 100) * 100;
  return amount;
}

/** Manual capture PaymentIntent. See CLAUDE.md "Manual Capture Flow". */
export async function createPaymentIntent(params: {
  amount: number;
  currency: 'ISK' | 'EUR' | 'USD';
  customerId?: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
}) {
  return stripe.paymentIntents.create(
    {
      amount: toStripeAmount(params.amount, params.currency),
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      capture_method: 'manual',
      metadata: params.metadata,
    },
    { idempotencyKey: params.idempotencyKey },
  );
}
