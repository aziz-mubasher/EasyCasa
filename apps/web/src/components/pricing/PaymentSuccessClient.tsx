'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { getOrder } from '@/lib/payments-api';
import { formatEuroCents } from '@/lib/pricing-display';
import { apiUrl } from '@/auth/authedFetch';

type Props = { locale: string };

export function PaymentSuccessClient({ locale }: Props) {
  const t = useTranslations('pricing.paymentResult');
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? '';
  const [status, setStatus] = useState<string | null>(null);
  const [dueNow, setDueNow] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    void getOrder(orderId)
      .then((o) => {
        setStatus(o.status);
        setDueNow(o.dueNowGrossCents);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t('loadFailed')));
  }, [orderId, t]);

  const previewHref = orderId
    ? apiUrl(`/invoices/orders/${encodeURIComponent(orderId)}/preview`)
    : null;

  return (
    <div className="max-w-lg mx-auto py-10 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">{t('successTitle')}</h1>
      <p className="mt-3 text-sm text-muted">{t('successBody')}</p>
      {status ? (
        <p className="mt-4 text-sm">
          {t('orderStatus')}: <span className="data font-medium">{status}</span>
        </p>
      ) : null}
      {dueNow != null ? (
        <p className="mt-1 text-sm text-muted">
          {t('orderTotal')}: {formatEuroCents(dueNow, locale)}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-clay" role="alert">
          {error}
        </p>
      ) : null}
      {previewHref ? (
        <p className="mt-6">
          <a
            href={previewHref}
            className="text-sm underline text-azure hover:brightness-110"
            target="_blank"
            rel="noreferrer"
          >
            {t('invoicePreview')}
          </a>
        </p>
      ) : null}
      <p className="mt-8">
        <Link href={`/${locale}/pricing`} className="text-sm underline hover:text-azure">
          {t('backPricing')}
        </Link>
      </p>
    </div>
  );
}
