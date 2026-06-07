import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Server-only deps — keep out of edge / client bundles.
  serverExternalPackages: ['@prisma/client', 'prisma', 'bullmq', 'ioredis', 'stripe'],
  // Vanity URL printed on the in-vehicle QR stickers. As of June 2026 the QR
  // points passengers at the site root (the landing page now carries the
  // "Because we care" / Report a driver section) rather than straight to the
  // feedback form, to drive familiarity with the platform. The `?ref=qr`
  // marker lets the landing page recognise a QR arrival and perform the
  // one-time, interruptible auto-scroll to the CareBand (see
  // src/components/landing/use-qr-care-scroll.ts) without affecting visitors
  // who come to the homepage to book. next.config redirects run BEFORE the
  // next-intl middleware, which then localizes `/` → `/{locale}` (query string
  // preserved). Kept as a 307 (non-permanent) so existing stickers can be
  // re-pointed later without browsers caching a stale target.
  async redirects() {
    return [
      {
        source: '/qr',
        destination: '/?ref=qr',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
