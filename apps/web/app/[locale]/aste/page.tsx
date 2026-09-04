import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AsteLandingPage } from '@/components/services/AsteLandingPage';
import { AsteLabEntryBanner } from '@/components/services/AsteLabEntryBanner';
import { routing } from '@/i18n/routing';
import { asteAnalysisRouteMounted } from '@/lib/aste-analysis-config';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'aste' });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `https://easycasaita.com/${l}/aste`]),
  );

  return {
    title: { absolute: t('meta.title') },
    description: t('meta.description'),
    alternates: {
      canonical: `https://easycasaita.com/${locale}/aste`,
      languages,
    },
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      type: 'website',
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_GB',
    },
  };
}

export default async function AsteRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      {asteAnalysisRouteMounted() ? <AsteLabEntryBanner /> : null}
      <AsteLandingPage />
    </>
  );
}
