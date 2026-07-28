'use client';

import { useTranslations } from 'next-intl';

import { MyViewingsList } from '@/components/viewings/MyViewingsList';
import { Link } from '@/i18n/routing';

export default function MyViewingsPage() {
  const t = useTranslations('viewings');

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('mineTitle')}</h1>
      <p className="mt-2 text-sm text-muted max-w-xl">{t('mineSubtitle')}</p>
      <p className="mt-3">
        <Link
          href="/viewings/conducting"
          className="text-sm text-azure underline hover:no-underline"
        >
          {t('conductingLink')}
        </Link>
      </p>
      <MyViewingsList />
    </section>
  );
}
