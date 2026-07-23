'use client';

import { useTranslations } from 'next-intl';
import { useSearchUrlState } from './useSearchUrlState';

type ChipDef = { key: string; label: string };

export function ActiveFilterChips({
  regions,
  categories,
  provinces,
  facets,
}: {
  regions: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
  provinces: Array<{ slug: string; name: string }>;
  facets: Record<string, Record<string, number>>;
}) {
  const t = useTranslations('search');
  const tf = useTranslations('search.filters');
  const { get, remove, clearAll, setMany, params } = useSearchUrlState();

  const chips: ChipDef[] = [];
  const tx = get('transactionType');
  if (tx) chips.push({ key: 'transactionType', label: tf(tx as 'sale' | 'rent') });
  const cat = get('categorySlug');
  if (cat) chips.push({ key: 'categorySlug', label: categories.find((c) => c.slug === cat)?.name ?? cat });
  const reg = get('regionSlug');
  if (reg) chips.push({ key: 'regionSlug', label: regions.find((r) => r.slug === reg)?.name ?? reg });
  const prov = get('provinceSlug');
  if (prov) chips.push({ key: 'provinceSlug', label: provinces.find((p) => p.slug === prov)?.name ?? prov });
  const minP = get('minPrice');
  const maxP = get('maxPrice');
  if (minP || maxP) {
    chips.push({
      key: 'price',
      label: `${tf('price')}: ${minP ? `€${Number(minP).toLocaleString('it-IT')}` : '…'} – ${maxP ? `€${Number(maxP).toLocaleString('it-IT')}` : '…'}`,
    });
  }
  const beds = get('minBedrooms');
  if (beds) chips.push({ key: 'minBedrooms', label: `${tf('bedrooms')} ≥ ${beds}` });
  const baths = get('minBathrooms');
  if (baths) chips.push({ key: 'minBathrooms', label: `${tf('bathrooms')} ≥ ${baths}` });
  const minS = get('minSizeSqm');
  const maxS = get('maxSizeSqm');
  if (minS || maxS) chips.push({ key: 'size', label: `${tf('size')}: ${minS || '…'} – ${maxS || '…'} m²` });
  const energy = get('energyClass');
  if (energy) chips.push({ key: 'energyClass', label: `${tf('energy')}: ${energy}` });
  const city = get('city');
  if (city) chips.push({ key: 'city', label: city });
  const q = get('q');
  if (q) chips.push({ key: 'q', label: `"${q}"` });
  const sort = get('sort');
  if (sort) chips.push({ key: 'sort', label: tf(`sort_${sort}` as 'sort_price:asc') });

  if (chips.length === 0) return null;

  const removeChip = (key: string) => {
    if (key === 'price') setMany({ minPrice: null, maxPrice: null });
    else if (key === 'size') setMany({ minSizeSqm: null, maxSizeSqm: null });
    else remove(key);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => removeChip(c.key)}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sand/40 px-3 py-1 text-sm hover:border-ink transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
          aria-label={t('removeFilter', { filter: c.label })}
        >
          <span>{c.label}</span>
          <span aria-hidden="true" className="text-muted">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-sm text-azure hover:underline ml-1"
      >
        {tf('clearAll')}
      </button>
      {/* facet counts hint — show province counts when filtered */}
      {facets.provinceSlug && Object.keys(facets.provinceSlug).length > 0 && !params.get('provinceSlug') && (
        <span className="text-xs text-muted ml-auto hidden sm:inline">
          {Object.entries(facets.provinceSlug)
            .slice(0, 3)
            .map(([slug, count]) => {
              const name = provinces.find((p) => p.slug === slug)?.name ?? slug;
              return `${name} ${count}`;
            })
            .join(' · ')}
        </span>
      )}
    </div>
  );
}
