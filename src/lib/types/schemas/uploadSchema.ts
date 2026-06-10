import { z } from 'zod';

/**
 * Evidence upload contract — shared FE/BE. The client requests a presigned PUT
 * URL per file; the route validates with `presignUploadSchema`; the form caps
 * counts/sizes/types with the same constants so client and server never drift.
 */

export const EVIDENCE_MAX_FILES = 5;
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const EVIDENCE_MAX_MB = EVIDENCE_MAX_BYTES / (1024 * 1024);

export const EVIDENCE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'application/pdf',
] as const;

export type EvidenceContentType = (typeof EVIDENCE_ALLOWED_TYPES)[number];

export const presignUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(EVIDENCE_ALLOWED_TYPES),
  size: z.number().int().positive().max(EVIDENCE_MAX_BYTES).optional(),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export interface PresignUploadResponse {
  url: string;
  key: string;
}
