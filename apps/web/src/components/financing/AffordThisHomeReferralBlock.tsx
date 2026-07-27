'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getBanks4AllReferralUrl } from '@/lib/banks4all-referral';

const externalRel = 'noopener noreferrer';

function AffordabilityIllustration() {
  return (
    <svg
      viewBox="0 0 120 96"
      className="h-24 w-[7.5rem] shrink-0 text-azure"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="afford-home-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="8" y="52" width="72" height="36" rx="4" fill="url(#afford-home-fill)" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 52 L44 28 L76 52"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="36" y="64" width="16" height="24" rx="1" fill="currentColor" fillOpacity="0.25" />
      <circle cx="92" cy="36" r="22" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M84 36 L89 41 L100 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M88 68 C88 62 92 58 98 58 C104 58 108 62 108 68 L108 72 L88 72 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="98" cy="66" r="3" fill="currentColor" fillOpacity="0.4" />
      <rect x="95" y="68" width="6" height="4" rx="1" fill="currentColor" fillOpacity="0.35" />
    </svg>
  );
}

type Props = {
  className?: string;
};

/** Prominent under-gallery referral — free Banks4All Property Investment Plan (Phase A, no PII). */
export function AffordThisHomeReferralBlock({ className = '' }: Props) {
  const locale = useLocale();
  const t = useTranslations('banks4AllReferral');
  const portalHref = getBanks4AllReferralUrl(locale, 'propertyPlanPortal');
  const infoHref = getBanks4AllReferralUrl(locale, 'propertyInvestmentPlan');
  const portalHostLabel = t('externalHint', { host: 'portal.banks4all.eu' });
  const infoHostLabel = t('externalHint', { host: 'banks4all.eu' });
  const headingId = 'afford-this-home-referral-heading';

  return (
    <aside
      className={`relative overflow-hidden rounded-xl2 border border-line bg-gradient-to-br from-paper via-paper to-azure/10 p-5 sm:p-6 shadow-sm ${className}`.trim()}
      aria-labelledby={headingId}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-azure/8 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="hidden sm:flex sm:items-center sm:justify-center sm:rounded-xl sm:bg-sand/50 sm:p-3">
          <AffordabilityIllustration />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-pine/30 bg-pine/10 px-2.5 py-0.5 text-xs font-medium text-pine">
              {t('heroFreeBadge')}
            </span>
          </div>
          <h2 id={headingId} className="font-display text-lg sm:text-xl font-semibold text-ink leading-snug">
            {t('heroTitle')}
          </h2>
          <p className="text-sm text-muted leading-relaxed">{t('heroBody')}</p>
          <p className="text-xs text-muted leading-relaxed">{t('heroTrustLine')}</p>
          <p className="text-xs text-muted leading-relaxed">{t('heroAvailabilityLine')}</p>
          <p className="text-xs text-muted leading-relaxed">{t('heroNewcomerNote')}</p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
            <a
              href={portalHref}
              target="_blank"
              rel={externalRel}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-azure px-5 py-2.5 text-sm font-medium text-paper font-[var(--font-display)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
              aria-label={`${t('heroPrimaryCta')} — ${portalHostLabel}`}
            >
              {t('heroPrimaryCta')}
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href={infoHref}
              target="_blank"
              rel={externalRel}
              className="text-sm font-medium text-azure underline decoration-line underline-offset-2 hover:decoration-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure rounded-sm"
              aria-label={`${t('heroSecondaryCta')} — ${infoHostLabel}`}
            >
              {t('heroSecondaryCta')}
            </a>
          </div>
        </div>
        <div className="flex justify-center sm:hidden" aria-hidden="true">
          <AffordabilityIllustration />
        </div>
      </div>
    </aside>
  );
}
