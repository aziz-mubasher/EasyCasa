'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getBanks4AllReferralUrl } from '@/lib/banks4all-referral';

type Variant = 'inline' | 'footerLink';

type Props = {
  variant: Variant;
  className?: string;
};

const externalRel = 'noopener noreferrer';

/** Neutral outbound referral to Banks4All for evidence-based financing qualification (Phase A). */
export function Banks4AllFinancingReferral({ variant, className = '' }: Props) {
  const locale = useLocale();
  const t = useTranslations('banks4AllReferral');
  const href = getBanks4AllReferralUrl(locale, 'propertyPlanPortal');
  const externalLabel = t('externalHint', { host: 'portal.banks4all.eu' });

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
