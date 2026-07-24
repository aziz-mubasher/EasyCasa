'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PriceRangeControl, formatPriceRangeLabel } from './PriceRangeControl';
import { useSearchUrlState } from './useSearchUrlState';

export function PriceRangeFilter() {
  const t = useTranslations('search.filters');
  const { get, setMany } = useSearchUrlState();
  const curMin = get('minPrice');
  const curMax = get('maxPrice');
  const [min, setMin] = useState(curMin);
  const [max, setMax] = useState(curMax);

  useEffect(() => {
    setMin(curMin);
    setMax(curMax);
  }, [curMin, curMax]);

  const badge = (curMin ? 1 : 0) + (curMax ? 1 : 0);
  const label = formatPriceRangeLabel(
    curMin,
    curMax,
    t('price'),
    t('priceFromWord'),
    t('priceToWord'),
  );

  const apply = () => setMany({ minPrice: min || null, maxPrice: max || null });
  const clear = () => {
    setMin('');
    setMax('');
    setMany({ minPrice: null, maxPrice: null });
  };

  return (
    <PriceRangeControl
      min={min}
      max={max}
      onMinChange={setMin}
      onMaxChange={setMax}
      onApply={apply}
      onClear={clear}
      triggerLabel={label}
      badge={badge || undefined}
      active={Boolean(curMin || curMax)}
    />
  );
}
