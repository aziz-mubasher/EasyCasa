'use client';

import { useTranslations } from 'next-intl';

import { ConductingViewingsList } from '@/components/viewings/ConductingViewingsList';
import { Link } from '@/i18n/routing';

export default function ConductingViewingsPage() {
  const t = useTranslations('viewings');

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink">{t('conductingTitle')}</h1>
      <p className="mt-2 text-sm text-muted max-w-xl">{t('conductingSubtitle')}</p>
      <p className="mt-3">
        <Link href="/viewings" className="text-sm text-azure underline hover:no-underline">
          {t('backToMine')}
        </Link>
      </p>
      <ConductingViewingsList />
    </section>
  );
}
