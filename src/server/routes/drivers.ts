import { Hono } from 'hono';

export const driversRoute = new Hono()
  .get('/', (c) => c.json({ drivers: [] }))
  .post('/', (c) => c.json({ error: 'Not implemented' }, 501))
  .get('/:id', (c) => c.json({ error: 'Not implemented', id: c.req.param('id') }, 501))
  .get('/:id/documents', (c) => c.json({ documents: [] }));
