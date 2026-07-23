'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FilterDropdown } from './FilterDropdown';
import { useSearchUrlState } from './useSearchUrlState';

export function SizeRangeFilter() {
  const t = useTranslations('search.filters');
  const { get, setMany } = useSearchUrlState();
  const curMin = get('minSizeSqm');
  const curMax = get('maxSizeSqm');
  const [min, setMin] = useState(curMin);
  const [max, setMax] = useState(curMax);

  const badge = (curMin ? 1 : 0) + (curMax ? 1 : 0);
  const label = curMin || curMax
    ? `${curMin || '…'} – ${curMax || '…'} m²`
    : t('size');

  const apply = () => setMany({ minSizeSqm: min || null, maxSizeSqm: max || null });
  const clear = () => {
    setMin('');
    setMax('');
    setMany({ minSizeSqm: null, maxSizeSqm: null });
  };

  return (
    <FilterDropdown
      label={label}
      badge={badge || undefined}
      footer={
        <>
          <button type="button" onClick={clear} className="text-sm text-muted hover:text-ink px-2 py-1">
            {t('clear')}
          </button>
          <button
            type="button"
            onClick={apply}
            className="text-sm bg-azure text-paper rounded-full px-4 py-1.5 hover:brightness-110"
          >
            {t('apply')}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          placeholder={t('sizeFrom')}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          aria-label={t('sizeFrom')}
        />
        <span className="text-muted text-sm">–</span>
        <input
          type="number"
          min={0}
          placeholder={t('sizeTo')}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
          aria-label={t('sizeTo')}
        />
      </div>
    </FilterDropdown>
  );
}
