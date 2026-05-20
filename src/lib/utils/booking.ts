const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusing chars

/**
 * Generates a booking code in the format HTCH-XXXX-XXXX. Uses crypto random
 * for uniqueness; callers should still enforce DB uniqueness constraint.
 */
export function generateBookingCode(): string {
  return `HTCH-${randomSegment(4)}-${randomSegment(4)}`;
}

function randomSegment(length: number): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
