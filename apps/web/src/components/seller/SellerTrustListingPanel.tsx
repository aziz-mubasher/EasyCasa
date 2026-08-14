'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/routing';
import { useSellerChecklist } from '@/hooks/useSellerChecklist';
import { useVerifiedOwner } from '@/hooks/useVerifiedOwner';

import { SellerChecklistPanel } from './SellerChecklistPanel';
import { SellerVerifiedOwnerPanel } from './SellerVerifiedOwnerPanel';

type Mode = 'verification' | 'documents';

type Props = {
  listingId: string;
  mode: Mode;
};

/** PP-6 — per-listing VO or checklist surface; 404-equivalent when API flags off. */
export function SellerTrustListingPanel({ listingId, mode }: Props) {
  const t = useTranslations('sellerTrust.page');
  const locale = useLocale();
  const { ready, isAuthenticated, signIn } = useAuth();
  const vo = useVerifiedOwner(listingId, mode === 'verification' && ready && isAuthenticated);
  const checklist = useSellerChecklist(listingId, mode === 'documents' && ready && isAuthenticated);

  if (!ready) return null;

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">{t('signInTitle')}</h1>
        <Button
          className="mt-6"
          onClick={() =>
            void signIn(`/${locale}/seller/listings/${listingId}/${mode === 'verification' ? 'verification' : 'documents'}`)
          }
        >
          {t('signIn')}
        </Button>
      </div>
    );
  }

  const flagOff = mode === 'verification' ? vo.flagOff : checklist.flagOff;
  if (flagOff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted">{t('unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header>
        <p className="text-sm text-muted">
          <Link href="/seller/listings" className="underline">
            {t('backToListings')}
          </Link>
        </p>
        <h1 className="font-display text-3xl mt-2">
          {mode === 'verification' ? t('verificationTitle') : t('documentsTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === 'verification' ? t('verificationLead') : t('documentsLead')}
        </p>
      </header>

      {mode === 'verification' ? (
        <SellerVerifiedOwnerPanel
          listingId={listingId}
          loading={vo.loading}
          flagOff={vo.flagOff}
          data={vo.data}
          onRefresh={vo.refresh}
        />
      ) : (
        <SellerChecklistPanel
          listingId={listingId}
          loading={checklist.loading}
          flagOff={checklist.flagOff}
          data={checklist.data}
          onRefresh={checklist.refresh}
        />
      )}
    </div>
  );
}
