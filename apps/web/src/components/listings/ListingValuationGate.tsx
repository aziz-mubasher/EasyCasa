'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { SignInPrompt } from '@/components/AuthControls';
import { RegisteredOnly } from '@/components/auth/RegisteredOnly';

/**
 * Property evaluation chrome + auth gate.
 * Pass the Server Component band as `children` from a Server parent —
 * do not import async server components into this client module.
 */
export function ListingValuationGate({ children }: { children: ReactNode }) {
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
        {children}
      </RegisteredOnly>
    </section>
  );
}
