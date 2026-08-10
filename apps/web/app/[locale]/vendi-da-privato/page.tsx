import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SellPrivatelyPage } from '@/components/services/SellPrivatelyPage';
import { routing } from '@/i18n/routing';
import {
  getSellPrivatelyLedger,
  sellPrivatelyAbsoluteUrl,
  sellPrivatelyLanguageAlternates,
  visiblePromiseEntries,
} from '@/lib/sell-privately';

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
    title: t('meta.title'),
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
  const ledger = getSellPrivatelyLedger();
  const liveBenefits = visiblePromiseEntries(ledger.benefits).filter((b) => b.status === 'live');

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: t('schema.serviceName'),
    description: t('meta.description'),
    url: pageUrl,
    serviceType: t('schema.serviceType'),
    provider: {
      '@type': 'Organization',
      name: 'EasyCasa',
      legalName: 'MUNDIDA S.r.l.',
      url: SITE,
      taxID: 'IT04531990986',
    },
    areaServed: { '@type': 'Country', name: 'Italy' },
    availableLanguage: ['it', 'en', 'es'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      description: t('schema.offerDescription'),
    },
    // Only advertise live ledger capabilities in structured data.
    additionalProperty: liveBenefits.map((b) => ({
      '@type': 'PropertyValue',
      name: t(`benefits.items.${b.id}.title`),
      value: t(`benefits.items.${b.id}.body`),
    })),
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }}
      />
      <SellPrivatelyPage />
    </>
  );
}
