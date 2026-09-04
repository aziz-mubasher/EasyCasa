import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Passthrough root layout — next-intl keeps `<html>` / `<body>` in `[locale]/layout`.
 * Required so non-locale routes (e.g. `/listing/[slug]` QR deep-links) can build.
 * metadataBase + title template live here (B.1); localized default/description
 * stay on the locale layout.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    template: '%s · EasyCasa',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
