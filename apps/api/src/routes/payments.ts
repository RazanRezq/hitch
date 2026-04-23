import { Hono } from 'hono';

/** Stripe PaymentIntent with manual capture. See CLAUDE.md "PAYMENTS". */
export const paymentsRoute = new Hono().post('/intent', (c) =>
  c.json({ error: 'Not implemented' }, 501),
);
