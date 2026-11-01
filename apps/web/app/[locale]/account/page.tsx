'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';

import { Link } from '@/i18n/routing';
import { billingReturnKind } from '@/lib/seller-monetisation';

function AccountBillingReturnInner() {
  const t = useTranslations('sellerMonetisation.billingReturn');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const kind = billingReturnKind(searchParams.get('billing'));

  useEffect(() => {
    if (kind !== 'success') return;
    if (locale === 'it' || locale === 'en' || locale === 'es') {
      trackProduct(PRODUCT_EVENTS.SELLER_PAID_SERVICE_PURCHASED, { locale, source: 'membership' });
    }
  }, [kind, locale]);

  if (kind === 'success') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">{t('successTitle')}</h1>
        <p className="mt-3 text-sm text-muted">{t('successBody')}</p>
        <Link href="/seller/listings" className="mt-6 inline-block underline">
          {t('backToListings')}
        </Link>
      </div>
    );
  }

  if (kind === 'cancel') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">{t('cancelTitle')}</h1>
        <p className="mt-3 text-sm text-muted">{t('cancelBody')}</p>
        <Link href="/seller/listings" className="mt-6 inline-block underline">
          {t('backToListings')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-sm text-muted">{t('unknown')}</p>
      <Link href="/seller/list" className="mt-6 inline-block underline">
        {t('backToSeller')}
      </Link>
    </div>
  );
}

/** PP-5 — Stripe checkout return target (matches BILLING_SUCCESS/CANCEL_URL). */
export default function AccountBillingReturnPage() {
  const t = useTranslations('sellerMonetisation.billingReturn');
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <p className="text-sm text-muted">{t('successBody')}</p>
        </div>
      }
    >
      <AccountBillingReturnInner />
    </Suspense>
  );
}
