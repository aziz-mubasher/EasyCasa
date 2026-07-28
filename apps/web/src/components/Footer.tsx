'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { getBanks4AllReferralUrl } from '@/lib/banks4all-referral';
import { isMarketingServicePath } from '@/lib/marketing-service';

export function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();
  const pathname = usePathname();
  if (isMarketingServicePath(pathname)) return null;

  const propertyPlanHref = getBanks4AllReferralUrl(locale, 'propertyInvestmentPlan');
  const externalHint = t('externalHint', { host: 'banks4all.eu' });
  const linkClass = 'text-sm text-ink-soft hover:text-azure transition-colors';

  return (
    <footer className="border-t border-line mt-16 bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1 space-y-3 max-w-sm">
            <div className="font-display text-lg font-semibold tracking-tight text-ink">
              {t('companyName')}
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{t('tagline')}</p>
            <p className="text-xs leading-relaxed text-muted">{t('disclosure')}</p>
          </div>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="eyebrow mb-3">
              {t('columns.explore')}
            </h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/search" className={linkClass}>
                  {t('search')}
                </Link>
              </li>
              <li>
                <Link href="/add" className={linkClass}>
                  {t('add')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={linkClass}>
                  {t('pricing')}
                </Link>
              </li>
              <li>
                <Link href="/favorites" className={linkClass}>
                  {t('favorites')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-services">
            <h2 id="footer-services" className="eyebrow mb-3">
              {t('columns.services')}
            </h2>
            <ul className="space-y-2.5">
              <li>
                <Link href="/acquisto-assistito" className={linkClass}>
                  {t('acquistoAssistito')}
                </Link>
              </li>
              <li>
                <Link href="/valutazione-gratuita" className={linkClass}>
                  {t('valutazioneGratuita')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-financing">
            <h2 id="footer-financing" className="eyebrow mb-3">
              {t('columns.financing')}
            </h2>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={propertyPlanHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                  aria-label={`${t('propertyInvestmentPlan')} — ${externalHint}`}
                >
                  {t('propertyInvestmentPlan')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="data text-xs text-muted">
            © {new Date().getFullYear()} {t('companyName')} · MUNDIDA · {t('rights')}
          </p>
        </div>
      </div>
    </footer>
  );
}
