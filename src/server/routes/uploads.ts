import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { presignUploadSchema, type EvidenceContentType } from '@/lib/types';
import { getUploadUrl } from '@/server/services/storage';

/** File extension per allowed content type, for a tidy object key. */
const EXTENSION: Record<EvidenceContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

/** Keep only filesystem-safe characters; cap length. */
function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(-80) || 'file';
}

/**
 * Presigned PUT URLs for DigitalOcean Spaces. Files never pass through this
 * server — the client uploads directly to the returned URL, then sends back the
 * key with the complaint. Evidence is sensitive PII, so objects are private
 * (bucket default) and only ever read back through short-lived signed URLs.
 */
export const uploadsRoute = new Hono().post(
  '/presigned',
  zValidator('json', presignUploadSchema),
  async (c) => {
    const { filename, contentType } = c.req.valid('json');
    const ext = EXTENSION[contentType];
    const base = safeName(filename);
    const name = base.endsWith(`.${ext}`) ? base : `${base}.${ext}`;
    // Unguessable per-file prefix; no booking exists yet at upload time.
    const key = `complaints/evidence/${crypto.randomUUID()}/${name}`;
    const url = await getUploadUrl(key, contentType);
    return c.json({ url, key });
  },
);
