import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildService } from '@easycasa/shared';
import { JsonLdScript } from '@/components/JsonLdScript';
import { AcquistoAssistitoPage } from '@/components/services/AcquistoAssistitoPage';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

type SchemaOffer = { name: string; price: string };

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
    title: { absolute: t('meta.title') },
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
  const t = await getTranslations({ locale, namespace: 'acquistoAssistito' });
  const pageUrl = `${SITE}/${locale}/acquisto-assistito`;
  const schemaOffers = t.raw('schema.offers') as SchemaOffer[];

  const serviceLd = buildService({
    pageUrl,
    site: SITE,
    serviceName: t('schema.serviceName'),
    description: t('meta.description'),
    serviceType: t('schema.serviceType'),
    offers: schemaOffers.map((o) => ({
      name: o.name,
      price: o.price,
      priceCurrency: 'EUR',
    })),
  });

  return (
    <>
      <JsonLdScript data={serviceLd} />
      <AcquistoAssistitoPage />
    </>
  );
}
