import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HomeMarketingPage } from '@/components/home/HomeMarketingPage';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `https://easycasaita.com/${l}`]),
  );
  const robots =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
      ? { index: false, follow: false, nocache: true }
      : undefined;

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    robots,
    alternates: {
      canonical: `https://easycasaita.com/${locale}`,
      languages,
    },
    openGraph: {
      title: t('meta.ogTitle'),
      description: t('meta.description'),
      type: 'website',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_GB',
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeMarketingPage locale={locale} />;
}
