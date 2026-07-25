'use client';

import { useTranslations } from 'next-intl';
import { SignInPrompt } from '@/components/AuthControls';
import { RegisteredOnly } from '@/components/auth/RegisteredOnly';
import { ListingValuationBandSection } from '@/components/valuation/ListingValuationBandSection';

/** Property evaluation for signed-in users; login CTA for guests. */
export function ListingValuationGate({ slug }: { slug: string }) {
  const t = useTranslations('listingDetail');

  return (
    <section id="valuation" className="scroll-mt-28 space-y-4 max-w-3xl">
      <h2 className="font-display text-2xl font-semibold text-ink">{t('tabs.valuation')}</h2>
      <p className="text-sm text-muted">{t('valuationIntro')}</p>
      <RegisteredOnly
        fallback={
          <div className="rounded-xl border border-line bg-paper p-5">
            <SignInPrompt message={t('valuationSignIn')} />
          </div>
        }
      >
        <ListingValuationBandSection slug={slug} />
      </RegisteredOnly>
    </section>
  );
}
