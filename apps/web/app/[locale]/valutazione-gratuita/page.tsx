import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildService } from '@easycasa/shared';
import { JsonLdScript } from '@/components/JsonLdScript';
import { ValutazioneGratuitaPage } from '@/components/services/ValutazioneGratuitaPage';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'valutazioneGratuita' });
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `https://easycasaita.com/${l}/valutazione-gratuita`]),
  );

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `https://easycasaita.com/${locale}/valutazione-gratuita`,
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

export default async function ValutazioneGratuitaRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'valutazioneGratuita' });
  const pageUrl = `${SITE}/${locale}/valutazione-gratuita`;

  const serviceLd = buildService({
    pageUrl,
    site: SITE,
    serviceName: t('schema.serviceName'),
    description: t('meta.description'),
    serviceType: t('schema.serviceType'),
    offerDescription: t('schema.offerDescription'),
  });

  return (
    <>
      <JsonLdScript data={serviceLd} />
      <ValutazioneGratuitaPage />
    </>
  );
}
