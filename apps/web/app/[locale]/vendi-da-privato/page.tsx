import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLdScript } from '@/components/JsonLdScript';
import { SellPrivatelyPage } from '@/components/services/SellPrivatelyPage';
import { routing } from '@/i18n/routing';
import {
  getSellPrivatelyBenefits,
  sellPrivatelyAbsoluteUrl,
  sellPrivatelyLanguageAlternates,
} from '@/lib/sell-privately';
import { buildSellPrivatelyFaqLd, buildSellPrivatelyServiceLd } from '@/lib/sell-privately-schema';

type Props = { params: Promise<{ locale: string }> };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'sellPrivately' });
  const canonical = sellPrivatelyAbsoluteUrl(locale, SITE);

  return {
    title: { absolute: t('meta.title') },
    description: t('meta.description'),
    keywords: t.raw('meta.keywords') as string[],
    alternates: {
      canonical,
      languages: sellPrivatelyLanguageAlternates(SITE),
    },
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      type: 'website',
      url: canonical,
      locale: locale === 'it' ? 'it_IT' : locale === 'es' ? 'es_ES' : 'en_GB',
    },
  };
}

export default async function SellPrivatelyRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'sellPrivately' });
  const pageUrl = sellPrivatelyAbsoluteUrl(locale, SITE);
  const faq = t.raw('faq.items') as Array<{ q: string; a: string }>;
  const liveBenefits = getSellPrivatelyBenefits().filter((b) => b.status === 'live');

  const serviceLd = buildSellPrivatelyServiceLd({
    pageUrl,
    site: SITE,
    serviceName: t('schema.serviceName'),
    description: t('meta.description'),
    serviceType: t('schema.serviceType'),
    offerDescription: t('schema.offerDescription'),
    liveBenefits: liveBenefits.map((b) => ({
      id: b.id,
      title: t(`benefits.items.${b.id}.title`),
      body: t(`benefits.items.${b.id}.body`),
    })),
  });

  const faqLd = buildSellPrivatelyFaqLd(faq);

  return (
    <>
      <JsonLdScript data={serviceLd} />
      <JsonLdScript data={faqLd} />
      <SellPrivatelyPage />
    </>
  );
}
