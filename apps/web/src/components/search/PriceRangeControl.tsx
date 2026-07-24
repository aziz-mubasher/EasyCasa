'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { FilterDropdown } from './FilterDropdown';

/** Shared min/max price UI — used on /search (URL-synced) and homepage hero (local state). */
export function PriceRangeControl({
  min,
  max,
  onMinChange,
  onMaxChange,
  onApply,
  onClear,
  triggerLabel,
  badge,
  className = '',
}: {
  min: string;
  max: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
  triggerLabel: string;
  badge?: number;
  className?: string;
}) {
  const t = useTranslations('search.filters');
  const id = useId();

  return (
    <FilterDropdown
      label={triggerLabel}
      badge={badge}
      className={className}
      footer={
        <>
          <button type="button" onClick={onClear} className="text-sm text-muted hover:text-ink px-2 py-1">
            {t('clear')}
          </button>
          <button
            type="button"
            onClick={onApply}
            className="text-sm bg-azure text-paper rounded-full px-4 py-1.5 hover:brightness-110"
          >
            {t('apply')}
          </button>
        </>
      }
    >
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`${id}-min`}>
          {t('priceFrom')}
        </label>
        <input
          id={`${id}-min`}
          type="number"
          min={0}
          placeholder={t('priceFrom')}
          value={min}
          onChange={(e) => onMinChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onApply()}
          className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
        <span className="text-muted text-sm">–</span>
        <label className="sr-only" htmlFor={`${id}-max`}>
          {t('priceTo')}
        </label>
        <input
          id={`${id}-max`}
          type="number"
          min={0}
          placeholder={t('priceTo')}
          value={max}
          onChange={(e) => onMaxChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onApply()}
          className="data w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        />
      </div>
    </FilterDropdown>
  );
}

export function formatPriceRangeLabel(min: string, max: string, fallback: string): string {
  if (!min && !max) return fallback;
  return `${min ? `€${Number(min).toLocaleString('it-IT')}` : '…'} – ${max ? `€${Number(max).toLocaleString('it-IT')}` : '…'}`;
}
