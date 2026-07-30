import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function robots(): MetadataRoute.Robots {
  if (DEMO) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: SITE,
    };
  }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/partner', '/dashboard', '/*?*preview='],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
