'use client';

import { useTranslations } from 'next-intl';

import { FavoritesPageContent } from '@/components/favorites/FavoritesPageContent';

export default function FavoritesPage() {
  const t = useTranslations('favorites');

  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
      <p className="text-muted mt-2 text-sm max-w-2xl">{t('subtitle')}</p>
      <FavoritesPageContent />
    </section>
  );
}
