import { getTranslations } from 'next-intl/server';

import { SellerAnalyticsPanel } from '@/components/seller/SellerAnalyticsPanel';

type Props = { params: Promise<{ locale: string; id: string }> };

/** EC-S-T23 — seller listing analytics dashboard panel (flag-gated API). */
export default async function SellerListingAnalyticsPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('sellerAnalytics');

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow mb-2">{t('eyebrow')}</p>
      <SellerAnalyticsPanel listingId={id} />
    </section>
  );
}
