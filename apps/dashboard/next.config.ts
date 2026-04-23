import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: [
    '@hitch/ui',
    '@hitch/types',
    '@hitch/api-client',
    '@hitch/i18n',
    '@hitch/utils',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default withNextIntl(nextConfig);
