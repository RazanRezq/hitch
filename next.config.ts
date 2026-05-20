import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Server-only deps — keep out of edge / client bundles.
  serverExternalPackages: ['@prisma/client', 'prisma', 'bullmq', 'ioredis', 'stripe'],
};

export default withNextIntl(nextConfig);
