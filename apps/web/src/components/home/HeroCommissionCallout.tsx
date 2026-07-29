'use client';

import { useTranslations } from 'next-intl';

export function HeroCommissionCallout() {
  const t = useTranslations('home');
  return (
    <aside
      className="rounded-lg border border-azure/30 bg-azure/5 px-4 py-3 text-sm text-ink leading-relaxed"
      aria-label={t('commissionDisclosure')}
    >
      <p>{t('commissionDisclosure')}</p>
    </aside>
  );
}
