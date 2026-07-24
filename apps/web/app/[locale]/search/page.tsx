import { getTranslations } from 'next-intl/server';
import { searchListings, listRegions, listCategories, listProvinces } from '@/lib/api';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchFilters, SearchSortControl } from '@/components/search/SearchFilters';
import { ActiveFilterChips } from '@/components/search/ActiveFilterChips';
import { SearchResultsPanel } from '@/components/search/SearchResultsPanel';
import { ITALIAN_PROVINCES, type ListingSummary } from '@easycasa/shared';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const t = await getTranslations('search');

  const [data, regions, categories, provincesFromApi] = await Promise.all([
    searchListings(sp).catch(() => ({ items: [], total: 0, page: 1, pageSize: 24, facets: {} })),
    listRegions(),
    listCategories(),
    listProvinces(),
  ]);

  // Prefer API/DB list; fall back to shared ISTAT provinces so the filter never renders empty.
  const provinces =
    provincesFromApi.length > 0
      ? provincesFromApi
      : ITALIAN_PROVINCES.map((p) => ({ slug: p.slug, name: p.name, regionSlug: p.regionSlug }));

  const items = data.items as ListingSummary[];

  return (
    <section className="mx-auto max-w-7xl px-5 py-8">
      <h1 className="font-display text-3xl font-semibold">{t('title')}</h1>

      <div className="mt-5 relative">
        <SearchBar />
      </div>

      <div className="mt-4">
        <SearchFilters regions={regions} categories={categories} provinces={provinces} facets={data.facets} />
        <ActiveFilterChips regions={regions} categories={categories} provinces={provinces} facets={data.facets} />
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4 flex-wrap">
        <p className="font-display text-xl font-semibold tracking-tight">
          {t('resultsCount', { count: data.total })}
        </p>
        <SearchSortControl />
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <div className="text-muted py-20 text-center space-y-2">
            <p>{t('empty')}</p>
            <p className="text-sm">{t('emptyHint')}</p>
          </div>
        ) : (
          <SearchResultsPanel items={items} />
        )}
      </div>
    </section>
  );
}
