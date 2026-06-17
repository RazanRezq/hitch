/**
 * Shared shape for admin list endpoints so every table consumes the same
 * envelope. Keep in sync with the client-side ListEnvelope type.
 */
export interface ListEnvelope<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function listEnvelope<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): ListEnvelope<T> {
  return { items, total, page, pageSize };
}

/** Skip/take for Prisma from a 1-based page + pageSize. */
export function paginate(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * Parse a `field:dir` sort string against an allow-list. Falls back to the given
 * default when the field is missing or not allowed (prevents arbitrary orderBy).
 */
export function parseSort(
  sort: string | undefined,
  allowed: readonly string[],
  fallback: { field: string; dir: 'asc' | 'desc' },
): { field: string; dir: 'asc' | 'desc' } {
  if (!sort) return fallback;
  const [field, dirRaw] = sort.split(':');
  if (!field || !allowed.includes(field)) return fallback;
  return { field, dir: dirRaw === 'asc' ? 'asc' : 'desc' };
}
