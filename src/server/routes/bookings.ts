import { Hono } from 'hono';

/** Stub — to be implemented per HITCH_MASTER_PLAN.md §10 (7-step booking workflow). */
export const bookingsRoute = new Hono()
  .get('/', (c) => c.json({ bookings: [] }))
  .post('/', (c) => c.json({ error: 'Not implemented' }, 501))
  .get('/:id', (c) => c.json({ error: 'Not implemented', id: c.req.param('id') }, 501))
  .patch('/:id', (c) => c.json({ error: 'Not implemented' }, 501))
  .post('/:id/assign', (c) => c.json({ error: 'Not implemented' }, 501));
