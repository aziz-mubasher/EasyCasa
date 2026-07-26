'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

type Props = { locale: string };

export function PaymentCancelClient({ locale }: Props) {
  const t = useTranslations('pricing.paymentResult');

  return (
    <div className="max-w-lg mx-auto py-10 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">{t('cancelTitle')}</h1>
      <p className="mt-3 text-sm text-muted">{t('cancelBody')}</p>
      <p className="mt-8">
        <Link href={`/${locale}/pricing`} className="text-sm underline hover:text-azure">
          {t('backPricing')}
        </Link>
      </p>
    </div>
  );
}
