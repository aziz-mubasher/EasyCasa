'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { estimateAgencySavingEur } from '@/lib/sell-privately';
import './sell-privately.css';

const MIN = 100_000;
const MAX = 800_000;
const STEP = 10_000;
const DEFAULT = 250_000;

function formatEur(n: number, locale: string): string {
  const tag = locale === 'en' ? 'en-IE' : locale === 'es' ? 'es-ES' : 'it-IT';
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function SellPrivatelySavingsSlider() {
  const t = useTranslations('sellPrivately.savings');
  const locale = useLocale();
  const id = useId();
  const [price, setPrice] = useState(DEFAULT);
  const { net, withIva } = estimateAgencySavingEur(price);

  return (
    <div className="sp-slider" aria-labelledby={`${id}-label`}>
      <label id={`${id}-label`} htmlFor={`${id}-range`} className="sp-slider-label">
        {t('sliderLabel')}
      </label>
      <div className="sp-slider-row">
        <input
          id={`${id}-range`}
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={price}
          aria-valuetext={formatEur(price, locale)}
        />
        <span className="sp-datum sp-est" aria-live="polite">
          {formatEur(price, locale)}
        </span>
      </div>
      <p className="sp-slider-result">
        {t('sliderResultBefore')}{' '}
        <span className="sp-datum sp-est">
          {formatEur(net, locale)}–{formatEur(withIva, locale)}
        </span>
        {t('sliderResultAfter')}
      </p>
    </div>
  );
}
