import { Hono } from 'hono';
import { prisma } from '@/lib/db';
import { serializeReceiptDetail } from '@/server/lib/receipt-serialize';

/**
 * Public receipt view — GET /api/receipts/:id. No auth: a receipt is reachable
 * by its unguessable cuid (the Stripe-receipt model), so the QR printed on a
 * receipt resolves for whoever holds it. Read-only; issuing and listing stay
 * behind /api/admin/receipts (RBAC). `issuedById` is never exposed.
 */
export const receiptsRoute = new Hono().get('/:id', async (c) => {
  const id = c.req.param('id');
  const r = await prisma.receipt.findUnique({ where: { id } });
  if (!r) return c.json({ error: 'Receipt not found' }, 404);
  return c.json(serializeReceiptDetail(r));
});
