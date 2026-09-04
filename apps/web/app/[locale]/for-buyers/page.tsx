import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ForBuyersPage } from '@/components/services/ForBuyersPage';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'forBuyers' });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `https://easycasaita.com/${l}/for-buyers`]),
  );

  return {
    title: { absolute: t('meta.title') },
    description: t('meta.description'),
    alternates: {
      canonical: `https://easycasaita.com/${locale}/for-buyers`,
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

export default async function ForBuyersRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ForBuyersPage />;
}
