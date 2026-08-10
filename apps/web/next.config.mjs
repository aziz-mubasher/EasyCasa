import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@easycasa/shared', '@easycasa/api-client'],
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }] },
  experimental: {
    instrumentationHook: true,
  },
  async rewrites() {
    // Localized public URLs for Sell Privately (filesystem route: vendi-da-privato).
    return [
      { source: '/en/sell-privately', destination: '/en/vendi-da-privato' },
      { source: '/es/vender-como-particular', destination: '/es/vendi-da-privato' },
    ];
  },
};

export default withNextIntl(nextConfig);
