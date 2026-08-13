import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLdScript } from '@/components/JsonLdScript';
import { AcquistoAssistitoPage } from '@/components/services/AcquistoAssistitoPage';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'acquistoAssistito' });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `https://easycasaita.com/${l}/acquisto-assistito`]),
  );

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `https://easycasaita.com/${locale}/acquisto-assistito`,
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

export default async function AcquistoAssistitoRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Acquisto Assistito — buying property in Italy from abroad',
    serviceType: 'Property purchase support for non-resident buyers',
    provider: {
      '@type': 'Organization',
      name: 'EasyCasa',
      legalName: 'MUNDIDA',
      url: 'https://easycasaita.com',
    },
    areaServed: { '@type': 'Country', name: 'Italy' },
    availableLanguage: ['it', 'en', 'es'],
    offers: [
      { '@type': 'Offer', name: 'Verifica', price: '290', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Acquisto Assistito', price: '1490', priceCurrency: 'EUR' },
      { '@type': 'Offer', name: 'Trasferimento', price: '2900', priceCurrency: 'EUR' },
    ],
  };

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <AcquistoAssistitoPage />
    </>
  );
}
