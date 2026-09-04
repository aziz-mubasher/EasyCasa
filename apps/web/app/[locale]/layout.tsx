import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Bricolage_Grotesque, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Providers } from '@/components/Providers';
import { DemoBanner } from '@/components/DemoBanner';
import { OrganizationStructuredData } from '@/components/StructuredData';
import '../globals.css';
import '@/styles/easycasa-brand.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const bodyFont = Newsreader({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  // Newsreader has no size-adjust metrics in next/font; without this, Docker builds hang.
  adjustFontFallback: false,
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('home.title') },
    description: t('home.description'),
    alternates: {
      canonical: `/${locale}`,
      languages: { it: '/it', en: '/en', es: '/es' },
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Locale = (typeof routing.locales)[number];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${display.variable} ${bodyFont.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <OrganizationStructuredData />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <DemoBanner />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
