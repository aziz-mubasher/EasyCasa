'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { createAuthedFetch } from '@/auth/authedFetch';
import { StripeCheckoutLoader } from '@/components/pricing/StripeCheckoutClient';

type Props = { locale: string };

export function CheckoutPageClient({ locale }: Props) {
  const t = useTranslations('pricing.checkout');
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? '';
  const amountCents = Number(params.get('amountCents') ?? '0');
  const { getAccessToken } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  if (!orderId || amountCents <= 0) {
    return <p className="text-sm text-clay">{t('invalidSession')}</p>;
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="font-display text-2xl font-semibold text-ink">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted">{t('subtitle')}</p>
      <div className="mt-8 rounded-2xl border border-line bg-paper p-6">
        <StripeCheckoutLoader
          locale={locale}
          orderId={orderId}
          amountCents={amountCents}
          authedFetch={authedFetch}
        />
      </div>
    </div>
  );
}
