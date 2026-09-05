import type { ReactNode } from 'react';
import { Bricolage_Grotesque, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import { callBookingTextDirection, type CallBookingLocale } from '@easycasa/shared';
import '../../../app/globals.css';
import '@/styles/easycasa-brand.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const bodyFont = Newsreader({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  adjustFontFallback: false,
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export function DeskLocaleLayout({
  locale,
  children,
}: {
  locale: CallBookingLocale;
  children: ReactNode;
}) {
  return (
    <html
      lang={locale}
      dir={callBookingTextDirection(locale)}
      className={`${display.variable} ${bodyFont.variable} ${mono.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
