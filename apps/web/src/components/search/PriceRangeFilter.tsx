'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FilterDropdown } from './FilterDropdown';
import { useSearchUrlState } from './useSearchUrlState';

export function PriceRangeFilter() {
  const t = useTranslations('search.filters');
  const { get, setMany } = useSearchUrlState();
  const curMin = get('minPrice');
  const curMax = get('maxPrice');
  const [min, setMin] = useState(curMin);
  const [max, setMax] = useState(curMax);

  const badge = (curMin ? 1 : 0) + (curMax ? 1 : 0);
  const label = curMin || curMax
    ? `${curMin ? `€${Number(curMin).toLocaleString('it-IT')}` : '…'} – ${curMax ? `€${Number(curMax).toLocaleString('it-IT')}` : '…'}`
    : t('price');

  const apply = () => setMany({ minPrice: min || null, maxPrice: max || null });
  const clear = () => {
    setMin('');
    setMax('');
    setMany({ minPrice: null, maxPrice: null });
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
        <label className="sr-only" htmlFor="price-min">{t('priceFrom')}</label>
        <input
          id="price-min"
          type="number"
          min={0}
          placeholder={t('priceFrom')}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
        <span className="text-muted text-sm">–</span>
        <label className="sr-only" htmlFor="price-max">{t('priceTo')}</label>
        <input
          id="price-max"
          type="number"
          min={0}
          placeholder={t('priceTo')}
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
      </div>
    </FilterDropdown>
  );
}
