'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LocationTypeahead,
  emptyLocationSelection,
  locationSelectionToParams,
  type LocationSelection,
} from '@/components/search/LocationTypeahead';
import { PriceRangeControl, formatPriceRangeLabel } from '@/components/search/PriceRangeControl';
import { FilterDropdown } from '@/components/search/FilterDropdown';
import { useSearchUrlState } from '@/components/search/useSearchUrlState';

const SEARCH_PATH = '/search';

export function HeroSearchRow({
  categories,
}: {
  categories: Array<{ slug: string; name: string }>;
}) {
  const t = useTranslations('home');
  const tf = useTranslations('search.filters');
  const { setMany } = useSearchUrlState();
  const whereId = useId();

  const [location, setLocation] = useState<LocationSelection>(emptyLocationSelection);
  const [categorySlug, setCategorySlug] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [appliedMin, setAppliedMin] = useState('');
  const [appliedMax, setAppliedMax] = useState('');

  const priceBadge = (appliedMin ? 1 : 0) + (appliedMax ? 1 : 0);
  const priceLabel = formatPriceRangeLabel(appliedMin, appliedMax, tf('price'));

  const applyPrice = () => {
    setAppliedMin(minPrice);
    setAppliedMax(maxPrice);
  };

  const clearPrice = () => {
    setMinPrice('');
    setMaxPrice('');
    setAppliedMin('');
    setAppliedMax('');
  };

  const submit = () => {
    const trimmed = location.query.trim();
    let locParams: Record<string, string | null>;
    if (trimmed && !(location.city || location.provinceSlug || location.regionSlug)) {
      locParams = { q: trimmed, city: null, provinceSlug: null, regionSlug: null };
    } else if (trimmed) {
      locParams = locationSelectionToParams({ ...location, query: trimmed });
    } else {
      locParams = locationSelectionToParams(emptyLocationSelection());
    }

    setMany(
      {
        ...locParams,
        categorySlug: categorySlug || null,
        minPrice: appliedMin || null,
        maxPrice: appliedMax || null,
      },
      true,
      SEARCH_PATH,
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const categoryLabel = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name ?? tf('category')
    : tf('category');

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      aria-label={t('searchRowLabel')}
      className="rounded-xl border border-line bg-paper shadow-sm p-2 sm:p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch lg:flex-nowrap">
        <div className="flex flex-col gap-1 min-w-0 flex-1 sm:min-w-[10rem] lg:min-w-[12rem]">
          <label id={whereId} htmlFor={`${whereId}-input`} className="data text-[0.65rem] uppercase tracking-wide text-muted px-1">
            {t('where')}
          </label>
          <div className="rounded-lg border border-line/80 bg-sand/20 min-h-[2.75rem] flex items-center">
            <LocationTypeahead
              id={`${whereId}-input`}
              value={location.query}
              labelledBy={whereId}
              onChange={(query) =>
                setLocation((prev) => ({
                  ...prev,
                  query,
                  city: null,
                  provinceSlug: null,
                  regionSlug: null,
                  q: null,
                }))
              }
              onSelect={setLocation}
              showSearchIcon={false}
              placeholder={t('wherePlaceholder')}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 min-w-0 sm:w-auto">
          <span className="data text-[0.65rem] uppercase tracking-wide text-muted px-1">{tf('category')}</span>
          <FilterDropdown
            label={categoryLabel}
            badge={categorySlug ? 1 : undefined}
            className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto [&>button]:min-h-[2.75rem] [&>button]:justify-between"
          >
            <select
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              aria-label={tf('category')}
            >
              <option value="">{tf('all')}</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </FilterDropdown>
        </div>

        <div className="flex flex-col gap-1 min-w-0 sm:w-auto">
          <span className="data text-[0.65rem] uppercase tracking-wide text-muted px-1">{tf('price')}</span>
          <PriceRangeControl
            min={minPrice}
            max={maxPrice}
            onMinChange={setMinPrice}
            onMaxChange={setMaxPrice}
            onApply={applyPrice}
            onClear={clearPrice}
            triggerLabel={priceLabel}
            badge={priceBadge || undefined}
            className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto [&>button]:min-h-[2.75rem] [&>button]:justify-between"
          />
        </div>

        <div className="flex flex-col gap-1 sm:justify-end sm:shrink-0">
          <span className="data text-[0.65rem] uppercase tracking-wide text-muted px-1 sr-only sm:not-sr-only sm:invisible">
            {t('cta')}
          </span>
          <button
            type="submit"
            className="w-full sm:w-auto min-h-[2.75rem] rounded-lg bg-azure text-paper px-5 py-2.5 text-sm font-medium hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure whitespace-nowrap"
          >
            {t('cta')}
          </button>
        </div>
      </div>
    </form>
  );
}
