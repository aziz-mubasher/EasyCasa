'use client';

import { useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  ASSET_CLASS_SLUGS,
  CONDITION_SLUGS,
  FEATURE_SLUGS,
  FINANCING_OPTION_SLUGS,
  LEASE_TYPE_SLUGS,
  PROPERTY_TYPE_SLUGS,
  SELLER_TYPE_SLUGS,
  TRANSACTION_TYPE_SLUGS,
  comuniForProvince,
  type FeatureSlug,
} from '@easycasa/shared';
import { FilterDropdown } from './FilterDropdown';
import { PriceRangeFilter } from './PriceRangeFilter';
import { useSearchUrlState } from './useSearchUrlState';

const ENERGY_CLASSES = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

type Option = { slug: string; name: string };

function facetCount(
  facets: Record<string, Record<string, number>>,
  field: string,
  slug: string,
): number | undefined {
  return facets[field]?.[slug];
}

function slugOptions(
  slugs: readonly string[],
  t: (key: string) => string,
  prefix: string,
): Option[] {
  return slugs.map((slug) => ({ slug, name: t(`${prefix}.${slug}`) }));
}

function OptionList({
  options,
  value,
  onChange,
  facets,
  facetField,
  allLabel,
}: {
  options: Option[];
  value: string;
  onChange: (slug: string) => void;
  facets?: Record<string, Record<string, number>>;
  facetField?: string;
  allLabel: string;
}) {
  return (
    <ul className="max-h-64 overflow-y-auto -mx-1" role="listbox">
      <li role="option" aria-selected={!value}>
        <button
          type="button"
          onClick={() => onChange('')}
          className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${
            !value ? 'bg-azure/10 text-azure font-medium' : 'hover:bg-sand/50 text-ink'
          }`}
        >
          {allLabel}
        </button>
      </li>
      {options.map((o) => {
        const count = facets && facetField ? facetCount(facets, facetField, o.slug) : undefined;
        const selected = value === o.slug;
        return (
          <li key={o.slug} role="option" aria-selected={selected}>
            <button
              type="button"
              onClick={() => onChange(o.slug)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition flex justify-between gap-3 ${
                selected ? 'bg-azure/10 text-azure font-medium' : 'hover:bg-sand/50 text-ink'
              }`}
            >
              <span>{o.name}</span>
              {count != null && <span className="data text-muted shrink-0">{count}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AxisDropdown({
  idleLabel,
  value,
  options,
  onChange,
  facets,
  facetField,
  allLabel,
}: {
  idleLabel: string;
  value: string;
  options: Option[];
  onChange: (slug: string) => void;
  facets: Record<string, Record<string, number>>;
  facetField: string;
  allLabel: string;
}) {
  const selected = options.find((o) => o.slug === value);
  const label = selected?.name ?? idleLabel;
  return (
    <FilterDropdown label={label} badge={value ? 1 : undefined} active={Boolean(value)}>
      <OptionList
        options={options}
        value={value}
        onChange={onChange}
        facets={facets}
        facetField={facetField}
        allLabel={allLabel}
      />
    </FilterDropdown>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-medium text-muted mb-1.5">{children}</p>;
}

function parseFeaturesParam(raw: string): Set<FeatureSlug> {
  const set = new Set<FeatureSlug>();
  for (const part of raw.split(',')) {
    const slug = part.trim();
    if ((FEATURE_SLUGS as readonly string[]).includes(slug)) {
      set.add(slug as FeatureSlug);
    }
  }
  return set;
}

function featuresToParam(selected: Set<FeatureSlug>): string | null {
  const csv = FEATURE_SLUGS.filter((s) => selected.has(s)).join(',');
  return csv || null;
}

/**
 * Primary bar (product priority):
 * Private|Agency · Price · Property type · Condition · Use class · NIB · Location · For sale · Filters · Reset
 */
export function SearchFilters({
  regions,
  provinces,
  facets,
}: {
  regions: Array<{ slug: string; name: string }>;
  /** @deprecated retained for call-site compat */
  categories?: Array<{ slug: string; name: string }>;
  provinces: Array<{ slug: string; name: string; regionSlug?: string }>;
  facets: Record<string, Record<string, number>>;
}) {
  const t = useTranslations('search.filters');
  const { get, set, setMany, clearAll } = useSearchUrlState();

  const provinceSlug = get('provinceSlug');
  const tx = get('transactionType');
  const seller = get('sellerType');
  const asset = get('assetClass');
  const regionSlug = get('regionSlug');
  const city = get('city');

  const comuneOptions = useMemo(() => {
    if (!provinceSlug) return [];
    return comuniForProvince(provinceSlug).map((c) => ({ slug: c.name, name: c.name }));
  }, [provinceSlug]);

  const txOptions = useMemo(() => slugOptions(TRANSACTION_TYPE_SLUGS, t, 'transaction'), [t]);
  const assetOptions = useMemo(() => slugOptions(ASSET_CLASS_SLUGS, t, 'assetClass'), [t]);
  const propertyOptions = useMemo(() => slugOptions(PROPERTY_TYPE_SLUGS, t, 'propertyType'), [t]);
  const conditionOptions = useMemo(() => slugOptions(CONDITION_SLUGS, t, 'condition'), [t]);
  const financingOptions = useMemo(() => slugOptions(FINANCING_OPTION_SLUGS, t, 'financing'), [t]);
  const leaseOptions = useMemo(() => slugOptions(LEASE_TYPE_SLUGS, t, 'leaseType'), [t]);
  const sellerOptions = useMemo(() => slugOptions(SELLER_TYPE_SLUGS, t, 'sellerType'), [t]);

  const sellerLabel = seller
    ? sellerOptions.find((o) => o.slug === seller)?.name ?? seller
    : t('sellerTypeIdle');

  const locationLabel = (() => {
    if (city) return city;
    if (provinceSlug) {
      return provinces.find((p) => p.slug === provinceSlug)?.name ?? provinceSlug;
    }
    if (regionSlug) {
      return regions.find((r) => r.slug === regionSlug)?.name ?? regionSlug;
    }
    return t('locationGroup');
  })();
  const locationActive = Boolean(city || provinceSlug || regionSlug);

  const advancedKeys = [
    'leaseType',
    'minBedrooms',
    'minBathrooms',
    'minSizeSqm',
    'maxSizeSqm',
    'energyClass',
    'features',
  ] as const;
  const advancedCount = advancedKeys.reduce((n, key) => (get(key) ? n + 1 : n), 0);

  const featuresParam = get('features');
  const selectedFeatures = useMemo(
    () => parseFeaturesParam(featuresParam),
    [featuresParam],
  );

  const toggleFeature = (slug: FeatureSlug) => {
    const next = new Set(selectedFeatures);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setMany({ features: featuresToParam(next) });
  };

  const onProvinceChange = (value: string) => {
    setMany({
      provinceSlug: value || null,
      city: null,
    });
  };

  return (
    <div className="space-y-3" role="group" aria-label={t('barLabel')}>
      <div className="flex flex-wrap gap-2 items-center">
        {/* 1 · Private | Agency */}
        <FilterDropdown
          label={sellerLabel}
          badge={seller ? 1 : undefined}
          active={Boolean(seller)}
        >
          <OptionList
            options={sellerOptions}
            value={seller}
            onChange={(v) => set('sellerType', v)}
            facets={facets}
            facetField="sellerType"
            allLabel={t('all')}
          />
        </FilterDropdown>

        {/* 2 · Price */}
        <PriceRangeFilter />

        {/* 3 · Property type */}
        <AxisDropdown
          idleLabel={t('propertyTypeLabel')}
          value={get('propertyType')}
          options={propertyOptions}
          onChange={(v) => set('propertyType', v)}
          facets={facets}
          facetField="propertyType"
          allLabel={t('all')}
        />

        {/* 4 · Condition */}
        <AxisDropdown
          idleLabel={t('conditionLabel')}
          value={get('condition')}
          options={conditionOptions}
          onChange={(v) => set('condition', v)}
          facets={facets}
          facetField="condition"
          allLabel={t('all')}
        />

        {/* 5 · Use class */}
        <AxisDropdown
          idleLabel={t('assetClassLabel')}
          value={asset}
          options={assetOptions}
          onChange={(v) => set('assetClass', v)}
          facets={facets}
          facetField="assetClass"
          allLabel={t('all')}
        />

        {/* 6 · Purchase mode (NIB) */}
        <AxisDropdown
          idleLabel={t('financingLabel')}
          value={get('financingOption')}
          options={financingOptions}
          onChange={(v) => set('financingOption', v)}
          facets={facets}
          facetField="financingOptions"
          allLabel={t('all')}
        />

        {/* 7 · Location */}
        <FilterDropdown
          label={locationLabel}
          badge={locationActive ? 1 : undefined}
          active={locationActive}
          panelClassName="min-w-[18rem]"
        >
          <div className="space-y-3">
            <FieldLabel>{t('locationGroup')}</FieldLabel>
            <select
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              value={regionSlug}
              onChange={(e) =>
                setMany({
                  regionSlug: e.target.value || null,
                  provinceSlug: null,
                  city: null,
                })
              }
              aria-label={t('region')}
            >
              <option value="">{t('region')}</option>
              {regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                  {facets.regionSlug?.[r.slug] != null ? ` (${facets.regionSlug[r.slug]})` : ''}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
              value={provinceSlug}
              onChange={(e) => onProvinceChange(e.target.value)}
              aria-label={t('province')}
            >
              <option value="">{t('province')}</option>
              {provinces.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                  {facets.provinceSlug?.[p.slug] != null ? ` (${facets.provinceSlug[p.slug]})` : ''}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm disabled:opacity-50"
              value={city}
              disabled={!provinceSlug}
              onChange={(e) => set('city', e.target.value)}
              aria-label={t('comune')}
            >
              <option value="">{t('comune')}</option>
              {comuneOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </FilterDropdown>

        {/* 8 · For sale / transaction */}
        <AxisDropdown
          idleLabel={t('transactionLabel')}
          value={tx}
          options={txOptions}
          onChange={(v) => set('transactionType', v)}
          facets={facets}
          facetField="transactionType"
          allLabel={t('all')}
        />

        {/* 9 · More filters (remaining) */}
        <FilterDropdown
          label={t('moreFilters')}
          badge={advancedCount || undefined}
          active={advancedCount > 0}
          panelClassName="min-w-[20rem] max-w-[min(100vw-2rem,24rem)]"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {tx === 'rent' && (
              <div>
                <FieldLabel>{t('leaseTypeLabel')}</FieldLabel>
                <OptionList
                  options={leaseOptions}
                  value={get('leaseType')}
                  onChange={(v) => set('leaseType', v)}
                  facets={facets}
                  facetField="leaseType"
                  allLabel={t('all')}
                />
              </div>
            )}

            <div className={`${tx === 'rent' ? 'border-t border-line pt-3 ' : ''}space-y-3`}>
              <FieldLabel>{t('roomsAndSize')}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted space-y-1">
                  <span>{t('bedroomsMin')}</span>
                  <input
                    type="number"
                    min={0}
                    value={get('minBedrooms')}
                    onChange={(e) => set('minBedrooms', e.target.value)}
                    className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-muted space-y-1">
                  <span>{t('bathroomsMin')}</span>
                  <input
                    type="number"
                    min={0}
                    value={get('minBathrooms')}
                    onChange={(e) => set('minBathrooms', e.target.value)}
                    className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-muted space-y-1">
                  <span>{t('sizeFrom')}</span>
                  <input
                    type="number"
                    min={0}
                    value={get('minSizeSqm')}
                    onChange={(e) => set('minSizeSqm', e.target.value)}
                    className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-muted space-y-1">
                  <span>{t('sizeTo')}</span>
                  <input
                    type="number"
                    min={0}
                    value={get('maxSizeSqm')}
                    onChange={(e) => set('maxSizeSqm', e.target.value)}
                    className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <FieldLabel>{t('energy')}</FieldLabel>
              <OptionList
                options={ENERGY_CLASSES.map((ec) => ({ slug: ec, name: ec }))}
                value={get('energyClass')}
                onChange={(v) => set('energyClass', v)}
                facets={facets}
                facetField="energyClass"
                allLabel={t('all')}
              />
            </div>

            <div className="border-t border-line pt-3">
              <FieldLabel>{t('characteristicsLabel')}</FieldLabel>
              <div className="grid grid-cols-1 gap-1.5">
                {FEATURE_SLUGS.map((slug) => {
                  const checked = selectedFeatures.has(slug);
                  return (
                    <label
                      key={slug}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                        checked ? 'border-azure bg-azure/5 text-azure' : 'border-line hover:border-ink'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-[var(--azure)]"
                        checked={checked}
                        onChange={() => toggleFeature(slug)}
                      />
                      <span>{t(`feature.${slug}`)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </FilterDropdown>

        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-2 text-sm text-muted hover:text-ink hover:border-line transition shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
          aria-label={t('resetAll')}
        >
          <span aria-hidden="true" className="text-base leading-none">
            ↻
          </span>
          <span className="whitespace-nowrap">{t('resetAll')}</span>
        </button>
      </div>
    </div>
  );
}

export function SearchSortControl() {
  const t = useTranslations('search.filters');
  const { get, set } = useSearchUrlState();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">{t('sort')}</span>
      <select
        className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
        value={get('sort') || 'publishedAt:desc'}
        onChange={(e) => set('sort', e.target.value === 'publishedAt:desc' ? '' : e.target.value)}
        aria-label={t('sort')}
      >
        <option value="publishedAt:desc">{t('sort_publishedAt:desc')}</option>
        <option value="price:asc">{t('sort_price:asc')}</option>
        <option value="price:desc">{t('sort_price:desc')}</option>
      </select>
    </label>
  );
}
