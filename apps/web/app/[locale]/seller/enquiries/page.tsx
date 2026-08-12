import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SellerInboxPanel } from '@/components/seller/SellerInboxPanel';
import { sellerInboxRouteAllowed } from '@/lib/seller-inbox-config';

type Props = { params: Promise<{ locale: string }> };

/** Flag-gated dark route — 404 when NEXT_PUBLIC_SELLER_INBOX_ENABLED is off (prod default). */
export const dynamic = 'force-dynamic';

export default async function SellerEnquiriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!sellerInboxRouteAllowed()) {
    notFound();
  }
  const t = await getTranslations('sellerInbox');

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow mb-2">{t('eyebrow')}</p>
      <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted max-w-xl">{t('subtitle')}</p>
      <div className="mt-8">
        <SellerInboxPanel />
      </div>
    </section>
  );
}
