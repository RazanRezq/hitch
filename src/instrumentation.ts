import type { Instrumentation } from 'next';

/**
 * Next.js server instrumentation — boots Sentry for the Next-hosted process
 * (pages + the Hono API mounted at /api/[[...route]]). The WS and workers
 * processes have their own initSentry calls in their entrypoints.
 *
 * Dynamic imports keep @sentry/node (Node-only, also listed in
 * serverExternalPackages) out of the edge bundle.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('./server/lib/sentry');
    initSentry('web');
  }
}

/** Report errors from Next's own request handling (rendering, route handlers). */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { Sentry } = await import('./server/lib/sentry');
    Sentry.captureException(err, { extra: { path: request.path, method: request.method } });
  }
};
