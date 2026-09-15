import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';

import { PricingPageView } from '@/components/pricing/PricingPageView';
import { listServiceCatalog, listServicePackages } from '@/lib/api';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('pricing.title'),
    description: t('pricing.description'),
    alternates: { canonical: `/${locale}/pricing` },
  };
}

export default async function PricingPage() {
  const locale = await getLocale();
  const [items, packages] = await Promise.all([listServiceCatalog(), listServicePackages()]);

  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <PricingPageView locale={locale} items={items} packages={packages} />
    </section>
  );
}
