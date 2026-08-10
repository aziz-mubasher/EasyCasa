import { createRequire } from 'node:module';
import createNextIntlPlugin from 'next-intl/plugin';
import { validateLedger } from './scripts/validate-promise-ledger.mjs';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const require = createRequire(import.meta.url);

// Build-time ledger validation (EC-S-T03) — malformed / un-counseled live blocks fail the build.
validateLedger(require('./src/config/sell-privately/promises.json'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@easycasa/shared', '@easycasa/api-client'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }] },
  experimental: {
    instrumentationHook: true,
  },
  async redirects() {
    return [
      {
        source: '/es/vender-como-particular',
        destination: '/es/vender-entre-particulares',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/en/sell-privately', destination: '/en/vendi-da-privato' },
      { source: '/es/vender-entre-particulares', destination: '/es/vendi-da-privato' },
    ];
  },
};

export default withNextIntl(nextConfig);
