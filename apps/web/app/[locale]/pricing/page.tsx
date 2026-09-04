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
  const t = await getTranslations('pricing');
  const locale = await getLocale();
  const [items, packages] = await Promise.all([listServiceCatalog(), listServicePackages()]);

  return (
    <section className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-4 text-lg text-muted">{t('subtitle')}</p>
      <p className="mt-3 text-sm text-muted border-l-2 border-azure/40 pl-4">{t('disclosure')}</p>

      {items.length === 0 ? (
        <p className="mt-10 text-muted">{t('empty')}</p>
      ) : (
        <div className="mt-4">
          <PricingPageView locale={locale} items={items} packages={packages} />
        </div>
      )}
      <p className="mt-8 data text-xs text-muted">{t('iva')}</p>
    </section>
  );
}
