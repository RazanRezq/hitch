import { Hono } from 'hono';

/** Presigned PUT URLs for DigitalOcean Spaces. Files never pass through this server. */
export const uploadsRoute = new Hono().post('/presigned', (c) =>
  c.json({ error: 'Not implemented' }, 501),
);
