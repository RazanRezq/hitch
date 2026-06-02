import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Server-only deps — keep out of edge / client bundles.
  serverExternalPackages: ['@prisma/client', 'prisma', 'bullmq', 'ioredis', 'stripe'],
  // Permanent vanity URL printed on the in-vehicle QR stickers. next.config
  // redirects run BEFORE the next-intl middleware, which then localizes
  // `/feedback` → `/{locale}/feedback`. Kept as a 307 (non-permanent) so the
  // destination can be re-pointed later without browsers caching a stale target.
  async redirects() {
    return [
      {
        source: '/qr',
        destination: '/feedback',
        permanent: false,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
