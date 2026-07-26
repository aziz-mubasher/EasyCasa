'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getBanks4AllReferralUrl } from '@/lib/banks4all-referral';

type Variant = 'card' | 'inline' | 'footerLink';

type Props = {
  variant: Variant;
  className?: string;
};

const externalRel = 'noopener noreferrer';

/** Neutral outbound referral to Banks4All for evidence-based financing qualification (Phase A). */
export function Banks4AllFinancingReferral({ variant, className = '' }: Props) {
  const locale = useLocale();
  const t = useTranslations('banks4AllReferral');
  const href = getBanks4AllReferralUrl(locale);
  const externalLabel = t('externalHint', { host: 'banks4all.eu' });

  if (variant === 'footerLink') {
    return (
      <a
        href={href}
        target="_blank"
        rel={externalRel}
        className={`text-sm text-azure hover:underline ${className}`.trim()}
        aria-label={`${t('footerLink')} — ${externalLabel}`}
      >
        {t('footerLink')}
      </a>
    );
  }

  if (variant === 'inline') {
    return (
      <p className={`text-sm text-muted leading-relaxed ${className}`.trim()}>
        {t('inlineBeforeLink')}{' '}
        <a
          href={href}
          target="_blank"
          rel={externalRel}
          className="text-ink underline decoration-line hover:decoration-ink"
          aria-label={`${t('inlineLink')} — ${externalLabel}`}
        >
          {t('inlineLink')}
        </a>
      </p>
    );
  }

  return (
    <aside
      className={`rounded-xl2 border border-line bg-sand/40 px-4 py-4 text-sm text-ink leading-relaxed space-y-2 ${className}`.trim()}
      aria-labelledby="banks4all-financing-referral-heading"
    >
      <h2 id="banks4all-financing-referral-heading" className="font-display text-base font-semibold text-ink">
        {t('cardTitle')}
      </h2>
      <p className="text-muted">{t('cardBody')}</p>
      <p className="text-muted text-xs">{t('cardNewcomerNote')}</p>
      <a
        href={href}
        target="_blank"
        rel={externalRel}
        className="inline-flex items-center text-sm font-medium text-azure hover:underline"
        aria-label={`${t('cardCta')} — ${externalLabel}`}
      >
        {t('cardCta')}
        <span aria-hidden="true" className="ml-1">
          ↗
        </span>
      </a>
    </aside>
  );
}
