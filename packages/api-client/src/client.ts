export interface ApiClientOptions {
  baseUrl?: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getBaseUrl(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:3001';
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  options: ApiClientOptions = {},
): Promise<T> {
  const url = `${getBaseUrl(options.baseUrl)}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };
  if (options.idempotencyKey && method !== 'GET') {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
  });

  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : res.statusText) || 'Request failed';
    throw new ApiError(res.status, parsed, message);
  }

  return parsed as T;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: ApiClientOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>('PATCH', path, body, options),
  put: <T>(path: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>('PUT', path, body, options),
  delete: <T>(path: string, options?: ApiClientOptions) =>
    request<T>('DELETE', path, undefined, options),
};
