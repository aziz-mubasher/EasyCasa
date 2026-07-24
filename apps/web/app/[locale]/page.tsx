import { getTranslations } from 'next-intl/server';
import { HeroMapLazy } from '@/components/home/HeroMapLazy';
import { HeroSearchRow } from '@/components/home/HeroSearchRow';
import { HeroCommissionCallout } from '@/components/home/HeroCommissionCallout';
import { searchListings } from '@/lib/api';
import type { ListingSummary } from '@easycasa/shared';

export default async function HomePage() {
  const t = await getTranslations('home');

  const data = await searchListings({ pageSize: 100 }).catch(() => ({
    items: [] as ListingSummary[],
    total: 0,
    page: 1,
    pageSize: 100,
    facets: {},
  }));

  return (
    <section className="mx-auto max-w-7xl px-5">
      <div className="grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24">
        <div>
          <p className="eyebrow mb-4">{t('eyebrow')} · 41.9°N 12.5°E</p>
          <h1 className="font-display text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-5 text-lg text-muted max-w-md">{t('subtitle')}</p>
          <div className="mt-8 space-y-4 max-w-xl">
            <HeroSearchRow />
            <HeroCommissionCallout />
          </div>
        </div>
        <HeroMapLazy items={data.items} ariaLabel={t('cta')} />
      </div>
    </section>
  );
}
