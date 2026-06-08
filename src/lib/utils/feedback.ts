import { randomSegment } from './booking';

/**
 * Human-friendly reference for an incident report, e.g. `RPT-7K9P-XX42`.
 * The `RPT-` prefix keeps it visually distinct from booking codes
 * (`HTCH-XXXX-XXXX`). Crypto-random; the DB `@unique` constraint on
 * `Feedback.reference` is the source of truth — callers retry on collision.
 */
export function generateFeedbackReference(): string {
  return `RPT-${randomSegment(4)}-${randomSegment(4)}`;
}
