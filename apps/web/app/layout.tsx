import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * Passthrough root layout — next-intl keeps `<html>` / `<body>` in `[locale]/layout`.
 * Required so non-locale routes (e.g. `/listing/[slug]` QR deep-links) can build.
 * metadataBase lives here. Next's Metadata type requires title.default and
 * title.template on the same object, so both stay on the locale layout.
 */
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
