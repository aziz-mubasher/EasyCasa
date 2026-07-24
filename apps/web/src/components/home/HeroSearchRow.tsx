'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  LocationTypeahead,
  emptyLocationSelection,
  locationSelectionToParams,
  type LocationSelection,
} from '@/components/search/LocationTypeahead';
import { PriceRangeControl, formatPriceRangeLabel } from '@/components/search/PriceRangeControl';
import { useSearchUrlState } from '@/components/search/useSearchUrlState';

const SEARCH_PATH = '/search';

type Deal = 'sale' | 'rent';

/**
 * Minimal homepage hero search — four controls only:
 * Vendita/Affitto · Dove? · Prezzo · Cerca
 * Reuses LocationTypeahead + PriceRangeControl from /search (PR #20).
 */
export function HeroSearchRow() {
  const t = useTranslations('home');
  const tf = useTranslations('search.filters');
  const ts = useTranslations('search');
  const { setMany } = useSearchUrlState();
  const whereId = useId();
  const dealGroupId = useId();

  const [deal, setDeal] = useState<Deal>('sale');
  const [location, setLocation] = useState<LocationSelection>(emptyLocationSelection);
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
        transactionType: deal,
        minPrice: appliedMin || null,
        maxPrice: appliedMax || null,
        categorySlug: null,
      },
      true,
      SEARCH_PATH,
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <div className="space-y-3">
      <form
        onSubmit={onSubmit}
        role="search"
        aria-label={t('searchRowLabel')}
        className="rounded-xl border border-line bg-paper shadow-sm p-3 sm:p-4"
      >
        {/* Vendita / Affitto — radiogroup, visually first */}
        <div
          role="radiogroup"
          aria-labelledby={`${dealGroupId}-label`}
          className="mb-3 inline-flex w-full sm:w-auto rounded-lg border border-line bg-sand/30 p-0.5"
        >
          <span id={`${dealGroupId}-label`} className="sr-only">
            {t('dealLabel')}
          </span>
          {([
            ['sale', tf('sale')],
            ['rent', tf('rent')],
          ] as const).map(([value, label]) => {
            const selected = deal === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setDeal(value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    setDeal((d) => (d === 'sale' ? 'rent' : 'sale'));
                  }
                }}
                className={`flex-1 sm:flex-none min-h-[2.5rem] rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure ${
                  selected
                    ? 'bg-ink text-paper shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/*
          Desktop: Dove + Prezzo + Cerca in one row.
          Mobile (375px): stack full-width — Dove, Prezzo, then Cerca.
        */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <label
              id={whereId}
              htmlFor={`${whereId}-input`}
              className="data text-[0.65rem] uppercase tracking-wide text-muted px-0.5"
            >
              {t('where')}
            </label>
            <div className="rounded-lg border border-line bg-sand/15 min-h-[2.75rem] flex items-center">
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

          <div className="flex flex-col gap-1 min-w-0 sm:w-[9.5rem] shrink-0">
            <span className="data text-[0.65rem] uppercase tracking-wide text-muted px-0.5">
              {tf('price')}
            </span>
            {/*
              Price: reuse PriceRangeControl (dropdown + da/a) — keeps the hero row
              to one compact trigger on desktop; full da/a would crowd the typography.
            */}
            <PriceRangeControl
              min={minPrice}
              max={maxPrice}
              onMinChange={setMinPrice}
              onMaxChange={setMaxPrice}
              onApply={applyPrice}
              onClear={clearPrice}
              triggerLabel={priceLabel}
              badge={priceBadge || undefined}
              className="w-full [&>button]:w-full [&>button]:min-h-[2.75rem] [&>button]:justify-between [&>button]:rounded-lg"
            />
          </div>

          <div className="flex flex-col gap-1 sm:shrink-0">
            <span className="data text-[0.65rem] uppercase tracking-wide text-muted px-0.5 invisible select-none" aria-hidden>
              {ts('searchButton')}
            </span>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-[2.75rem] rounded-lg bg-azure text-paper px-6 py-2.5 text-sm font-medium tracking-wide hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure whitespace-nowrap"
            >
              {ts('searchButton')}
            </button>
          </div>
        </div>
      </form>

      <p className="text-sm">
        <Link
          href="/search"
          className="text-azure underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
        >
          {t('cta')}
        </Link>
      </p>
    </div>
  );
}
