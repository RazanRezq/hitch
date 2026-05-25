import { stripe } from '../../lib/stripe';

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
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      capture_method: 'manual',
      metadata: params.metadata,
    },
    { idempotencyKey: params.idempotencyKey },
  );
}
