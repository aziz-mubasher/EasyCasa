'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { Banks4AllFinancingReferral } from '@/components/financing/Banks4AllFinancingReferral';
import { isListingLandingPath } from '@/lib/listing-landing';
import { isMarketingServicePath } from '@/lib/marketing-service';

export function Footer() {
  const t = useTranslations('footer');
  const tb = useTranslations('brand');
  const pathname = usePathname();
  if (isListingLandingPath(pathname) || isMarketingServicePath(pathname)) return null;

  return (
    <footer className="border-t border-line mt-16">
      <div className="mx-auto max-w-7xl px-5 py-10 flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-3 max-w-lg">
          <div className="font-display text-lg font-semibold">{tb('name')}</div>
          <p className="text-muted text-sm">{tb('tagline')}</p>
          <p className="text-muted text-xs leading-relaxed">{t('disclosure')}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/pricing" className="text-sm text-azure hover:underline">
              {t('pricing')}
            </Link>
            <Link href="/acquisto-assistito" className="text-sm text-azure hover:underline">
              {t('acquistoAssistito')}
            </Link>
            <Banks4AllFinancingReferral variant="footerLink" />
          </div>
        </div>
        <p className="data text-xs text-muted self-end">
          © {new Date().getFullYear()} MUNDIDA · {t('rights')}
        </p>
      </div>
    </footer>
  );
}
