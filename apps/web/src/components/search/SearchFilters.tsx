'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { comuniForProvince } from '@easycasa/shared';
import { FilterDropdown } from './FilterDropdown';
import { PriceRangeFilter } from './PriceRangeFilter';
import { SizeRangeFilter } from './SizeRangeFilter';
import { useSearchUrlState } from './useSearchUrlState';

const ENERGY_CLASSES = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

function facetCount(facets: Record<string, Record<string, number>>, field: string, slug: string): number | undefined {
  return facets[field]?.[slug];
}

function SelectFilter({
  label,
  paramKey,
  options,
  facets,
  facetField,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  paramKey: string;
  options: Array<{ slug: string; name: string }>;
  facets: Record<string, Record<string, number>>;
  facetField?: string;
  placeholder: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const { get, set } = useSearchUrlState();
  const val = get(paramKey);
  const badge = val ? 1 : 0;
  const display = val ? options.find((o) => o.slug === val)?.name ?? val : label;

  return (
    <FilterDropdown label={display} badge={badge || undefined}>
      <select
        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm disabled:opacity-50"
        value={val}
        disabled={disabled}
        onChange={(e) => (onChange ? onChange(e.target.value) : set(paramKey, e.target.value))}
        aria-label={placeholder}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const count = facetField ? facetCount(facets, facetField, o.slug) : undefined;
          return (
            <option key={o.slug} value={o.slug}>
              {o.name}{count != null ? ` (${count})` : ''}
            </option>
          );
        })}
      </select>
    </FilterDropdown>
  );
}

function NumberFilter({
  label,
  paramKey,
  placeholder,
}: {
  label: string;
  paramKey: string;
  placeholder: string;
}) {
  const { get, set } = useSearchUrlState();
  const val = get(paramKey);
  const display = val ? `${label} ≥ ${val}` : label;

  return (
    <FilterDropdown label={display} badge={val ? 1 : undefined}>
      <input
        type="number"
        min={0}
        placeholder={placeholder}
        defaultValue={val}
        onBlur={(e) => set(paramKey, e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && set(paramKey, (e.target as HTMLInputElement).value)}
        className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        aria-label={placeholder}
      />
    </FilterDropdown>
  );
}

export function SearchFilters({
  regions,
  categories,
  provinces,
  facets,
}: {
  regions: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
  provinces: Array<{ slug: string; name: string; regionSlug?: string }>;
  facets: Record<string, Record<string, number>>;
}) {
  const t = useTranslations('search.filters');
  const { get, set, setMany } = useSearchUrlState();

  const provinceSlug = get('provinceSlug');

  // Province list is independent of region (same UX as regions).
  // Comune list stays bound to the selected province to avoid ~8k options.
  const comuneOptions = useMemo(() => {
    if (!provinceSlug) return [];
    return comuniForProvince(provinceSlug).map((c) => ({ slug: c.name, name: c.name }));
  }, [provinceSlug]);

  const tx = get('transactionType');
  const txLabel = tx === 'sale' ? t('sale') : tx === 'rent' ? t('rent') : t('all');

  const onProvinceChange = (value: string) => {
    setMany({
      provinceSlug: value || null,
      city: null,
    });
  };

  return (
    <div className="space-y-3">
      {/* Location: Region + Province independent; Comune depends on Province */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible">
        <SelectFilter
          label={t('region')}
          paramKey="regionSlug"
          options={regions}
          facets={facets}
          facetField="regionSlug"
          placeholder={t('region')}
        />

        <SelectFilter
          label={t('province')}
          paramKey="provinceSlug"
          options={provinces}
          facets={facets}
          facetField="provinceSlug"
          placeholder={t('province')}
          onChange={onProvinceChange}
        />

        <SelectFilter
          label={t('comune')}
          paramKey="city"
          options={comuneOptions}
          facets={facets}
          placeholder={t('comune')}
          disabled={!provinceSlug}
        />

        <FilterDropdown label={txLabel} badge={tx ? 1 : undefined}>
          <select
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            value={tx}
            onChange={(e) => set('transactionType', e.target.value)}
            aria-label={t('all')}
          >
            <option value="">{t('all')}{facets.transactionType ? ` (${Object.values(facets.transactionType).reduce((a, b) => a + b, 0)})` : ''}</option>
            <option value="sale">{t('sale')}{facets.transactionType?.sale != null ? ` (${facets.transactionType.sale})` : ''}</option>
            <option value="rent">{t('rent')}{facets.transactionType?.rent != null ? ` (${facets.transactionType.rent})` : ''}</option>
          </select>
        </FilterDropdown>

        <SelectFilter
          label={t('category')}
          paramKey="categorySlug"
          options={categories}
          facets={facets}
          facetField="categorySlug"
          placeholder={t('category')}
        />

        <PriceRangeFilter />
        <NumberFilter label={t('bedrooms')} paramKey="minBedrooms" placeholder={t('bedroomsMin')} />
        <NumberFilter label={t('bathrooms')} paramKey="minBathrooms" placeholder={t('bathroomsMin')} />
        <SizeRangeFilter />

        <FilterDropdown label={get('energyClass') ? `${t('energy')}: ${get('energyClass')}` : t('energy')} badge={get('energyClass') ? 1 : undefined}>
          <select
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
            value={get('energyClass')}
            onChange={(e) => set('energyClass', e.target.value)}
            aria-label={t('energy')}
          >
            <option value="">{t('energy')}</option>
            {ENERGY_CLASSES.map((ec) => (
              <option key={ec} value={ec}>
                {ec}{facets.energyClass?.[ec] != null ? ` (${facets.energyClass[ec]})` : ''}
              </option>
            ))}
          </select>
        </FilterDropdown>

        <select
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm shrink-0"
          value={get('sort') || 'publishedAt:desc'}
          onChange={(e) => set('sort', e.target.value === 'publishedAt:desc' ? '' : e.target.value)}
          aria-label={t('sort')}
        >
          <option value="publishedAt:desc">{t('sort_publishedAt:desc')}</option>
          <option value="price:asc">{t('sort_price:asc')}</option>
          <option value="price:desc">{t('sort_price:desc')}</option>
        </select>
      </div>
    </div>
  );
}
