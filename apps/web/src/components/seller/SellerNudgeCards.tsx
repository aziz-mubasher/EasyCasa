'use client';

/**
 * EC-S-T24 — dismissible seller nudge cards (observation-only copy).
 * Numeric interpolation only; no CTA / advice verbs in i18n.
 */

import { useTranslations } from 'next-intl';
import { NUDGE_CODES, isNudgeCode, type NudgeCode } from '@easycasa/shared';

export type SellerNudgeItem = {
  code: NudgeCode;
  emittedAt: string;
  data: Record<string, number>;
};

type Props = {
  items: SellerNudgeItem[];
  onDismiss?: (code: NudgeCode) => void | Promise<void>;
  dismissingCode?: NudgeCode | null;
};

export function SellerNudgeCards({ items, onDismiss, dismissingCode }: Props) {
  const t = useTranslations('nudges');
  if (items.length === 0) return null;

  return (
    <section aria-label={t('title')} data-testid="seller-nudge-cards">
      <h2>{t('title')}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.code} data-nudge-code={item.code}>
            <p>{t(item.code, item.data)}</p>
            {onDismiss ? (
              <button
                type="button"
                disabled={dismissingCode === item.code}
                onClick={() => void onDismiss(item.code)}
              >
                {t('dismiss')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Filter API payload to known codes (defensive). */
export function filterNudgeItems(
  raw: Array<{ code: string; emittedAt: string; data?: Record<string, number> }>,
): SellerNudgeItem[] {
  const out: SellerNudgeItem[] = [];
  for (const row of raw) {
    if (!isNudgeCode(row.code)) continue;
    out.push({
      code: row.code,
      emittedAt: row.emittedAt,
      data: row.data ?? {},
    });
  }
  out.sort((a, b) => NUDGE_CODES.indexOf(a.code) - NUDGE_CODES.indexOf(b.code));
  return out;
}
