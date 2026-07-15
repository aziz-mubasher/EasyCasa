import { getTranslations } from 'next-intl/server';
import { searchListings, listRegions, listCategories } from '@/lib/api';
import { Filters } from '@/components/search/Filters';
import { ListingCard } from '@/components/listing/ListingCard';
import { MapView } from '@/components/search/MapView';
import type { ListingSummary } from '@easycasa/shared';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const t = await getTranslations('search');

  const [data, regions, categories] = await Promise.all([
    searchListings(sp).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24, facets: {} })),
    listRegions(),
    listCategories(),
  ]);

  const items = data.items as ListingSummary[];

  return (
    <section className="mx-auto max-w-7xl px-5 py-8">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>
        <span className="data text-sm text-muted">{t('resultsCount', { count: data.total })}</span>
      </div>

      <div className="mt-5"><Filters regions={regions} categories={categories} /></div>

      <div className="mt-6 grid lg:grid-cols-[1fr_420px] gap-6">
        <div>
          {items.length === 0 ? (
            <p className="text-muted py-20 text-center">{t('empty')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {items.map((l) => <ListingCard key={l.id} l={l} />)}
            </div>
          )}
        </div>
        <div className="hidden lg:block h-[70vh] sticky top-20">
          <MapView items={items} />
        </div>
      </div>
    </section>
  );
}
