import * as Sentry from '@sentry/node';

/**
 * Sentry bootstrap shared by all three server processes (Next-mounted API via
 * src/instrumentation.ts, WS runner, BullMQ workers). No-op when SENTRY_DSN is
 * unset — same "plug in your keys later" contract as the Resend placeholder —
 * and `Sentry.captureException` is itself a safe no-op before init, so capture
 * sites never need guards.
 */
export function initSentry(processTag: 'web' | 'ws' | 'workers'): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn(
      `[sentry] SENTRY_DSN not set — error tracking disabled (${processTag}). Set SENTRY_DSN to enable.`,
    );
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    // Errors only for now — tracing can be enabled later without code changes.
    tracesSampleRate: 0,
  });
  Sentry.setTag('process', processTag);
  console.log(`[sentry] error tracking enabled (${processTag})`);
}

export { Sentry };
