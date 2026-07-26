'use client';

import { useTranslations } from 'next-intl';

import type { ServiceQuoteRow } from '@/lib/api';
import { formatEuroCents, quoteLineLabel } from '@/lib/pricing-display';
import type { CatalogItemRow } from '@/lib/api';

type Props = {
  locale: string;
  quote: ServiceQuoteRow | null;
  open: boolean;
  onClose: () => void;
  catalogByCode: Record<string, CatalogItemRow>;
};

export function PricingQuotePanel({ locale, quote, open, onClose, catalogByCode }: Props) {
  const t = useTranslations('pricing.quote');

  if (!open || !quote) return null;

  const mailSubject = encodeURIComponent(t('emailSubject'));
  const mailBody = encodeURIComponent(buildQuoteEmailBody(quote, locale, catalogByCode, t));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-ink/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-quote-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-paper shadow-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="pricing-quote-title" className="font-display text-xl font-semibold text-ink">
            {t('resultTitle')}
          </h2>
          <button
            type="button"
            className="text-sm text-muted hover:text-ink rounded px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
            onClick={onClose}
          >
            {t('close')}
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">{t('notPayment')}</p>

        <ul className="mt-6 space-y-3 border-t border-line pt-4">
          {quote.lines.map((line) => {
            const label = quoteLineLabel(line, locale, catalogByCode);
            return (
              <li key={`${line.code}-${line.kind}`} className="flex justify-between gap-3 text-sm">
                <span>
                  {label}
                  {line.estimated ? (
                    <span className="block text-xs text-muted">{t('estimatedLine')}</span>
                  ) : null}
                </span>
                <span className="data shrink-0 font-medium">{formatEuroCents(line.grossCents, locale)}</span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t('dueNow')}</dt>
            <dd className="data font-semibold">{formatEuroCents(quote.dueNowGrossCents, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t('estimatedTotal')}</dt>
            <dd className="data font-semibold text-azure">
              {formatEuroCents(quote.estimatedTotalGrossCents, locale)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-muted leading-relaxed">{t('ivaNote')}</p>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href={`mailto:info@easycasaita.com?subject=${mailSubject}&body=${mailBody}`}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium font-[var(--font-display)] transition bg-azure text-paper hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure w-full text-center"
          >
            {t('sendEmail')}
          </a>
          <p className="text-xs text-muted text-center">{t('emailHint')}</p>
        </div>
      </div>
    </div>
  );
}

function buildQuoteEmailBody(
  quote: ServiceQuoteRow,
  locale: string,
  catalogByCode: Record<string, CatalogItemRow>,
  t: ReturnType<typeof useTranslations<'pricing.quote'>>,
): string {
  const lines = quote.lines
    .map((line) => {
      const label = quoteLineLabel(line, locale, catalogByCode);
      return `- ${label}: ${formatEuroCents(line.grossCents, locale)}`;
    })
    .join('\n');
  return `${t('emailIntro')}\n\n${lines}\n\n${t('dueNow')}: ${formatEuroCents(quote.dueNowGrossCents, locale)}\n${t('estimatedTotal')}: ${formatEuroCents(quote.estimatedTotalGrossCents, locale)}`;
}
