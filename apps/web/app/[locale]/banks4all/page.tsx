import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Banks4AllPage } from '@/components/services/Banks4AllPage';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'banks4allHub' });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `https://easycasaita.com/${l}/banks4all`]),
  );

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `https://easycasaita.com/${locale}/banks4all`,
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

export default async function Banks4AllRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Banks4AllPage />;
}
