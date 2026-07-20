import type { ReactNode } from 'react';

/**
 * Passthrough root layout — next-intl keeps `<html>` / `<body>` in `[locale]/layout`.
 * Required so non-locale routes (e.g. `/listing/[slug]` QR deep-links) can build.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
