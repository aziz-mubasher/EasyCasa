'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';
import { Field, TextArea } from '@/components/ui/Field';
import {
  parseIntestatariInput,
  resolveVoRejectionTemplateKey,
  voCanSubmit,
  voShowsRejectionReason,
  voStateToUiPhase,
  type VoCaseWire,
} from '@/lib/seller-trust';

import { SellerPrivateDocPicker } from './SellerPrivateDocPicker';

type Props = {
  listingId: string;
  loading: boolean;
  flagOff: boolean;
  data: VoCaseWire | null;
  onRefresh: () => Promise<void>;
};

/** PP-6 — Verified Owner submit, state display, rejection + resubmit. */
export function SellerVerifiedOwnerPanel({
  listingId,
  loading,
  flagOff,
  data,
  onRefresh,
}: Props) {
  const t = useTranslations('sellerTrust.verifiedOwner');
  const tReject = useTranslations('sellerTrust.rejectionTemplates');
  const { getAccessToken } = useAuth();
  const [intestatari, setIntestatari] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<
    'filesRequired' | 'intestatariRequired' | 'submitFailed' | 'conflict' | null
  >(null);

  if (flagOff) return null;
  if (loading && !data) {
    return <p className="text-sm text-muted">{t('loading')}</p>;
  }

  const state = data?.state ?? 'none';
  const phase = voStateToUiPhase(state);
  const canSubmit = voCanSubmit(state);

  const submit = async (files: File[]) => {
    const names = parseIntestatariInput(intestatari);
    if (!files.length) {
      setErrorKey('filesRequired');
      return;
    }
    if (!names.length) {
      setErrorKey('intestatariRequired');
      return;
    }
    setBusy(true);
    setErrorKey(null);
    try {
      const form = new FormData();
      form.append('intestatari', JSON.stringify(names));
      for (const file of files) {
        form.append('files', file);
      }
      const res = await createAuthedFetch(getAccessToken)(
        apiUrl(`/seller/vo/${listingId}/submit`),
        { method: 'POST', body: form },
      );
      if (res.status === 409) {
        setErrorKey('conflict');
        return;
      }
      if (!res.ok) {
        setErrorKey('submitFailed');
        return;
      }
      await onRefresh();
    } catch {
      setErrorKey('submitFailed');
    } finally {
      setBusy(false);
    }
  };

  const rejectionTemplate = voShowsRejectionReason(state)
    ? resolveVoRejectionTemplateKey(data?.decisionReason)
    : null;

  return (
    <section
      className="rounded-xl2 border border-line bg-paper p-5 space-y-4"
      data-testid="seller-vo-panel"
    >
      <header>
        <h2 className="font-display text-xl">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('lead')}</p>
      </header>

      <div
        className="rounded-lg border border-line bg-sand/40 px-4 py-3"
        data-testid={`vo-phase-${phase}`}
      >
        <p className="text-sm font-medium text-ink">{t(`state.${phase}`)}</p>
        <p className="mt-1 text-xs text-muted">{t(`stateHint.${phase}`)}</p>
      </div>

      {voShowsRejectionReason(state) && data?.decisionReason ? (
        <div className="rounded-lg border border-terracotta/30 bg-terracotta/5 px-4 py-3">
          <p className="text-sm font-medium text-ink">{t('rejectionTitle')}</p>
          <p className="mt-1 text-sm text-muted">
            {rejectionTemplate
              ? tReject(rejectionTemplate)
              : t('rejectionCustom', { reason: data.decisionReason })}
          </p>
        </div>
      ) : null}

      {state === 'verified' && data?.verifiedAt ? (
        <p className="text-xs text-muted">
          {t('verifiedAt', { date: data.verifiedAt.slice(0, 10) })}
        </p>
      ) : null}

      {canSubmit ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Field label={t('intestatariLabel')} hint={t('intestatariHint')}>
            <TextArea
              rows={3}
              value={intestatari}
              onChange={(e) => setIntestatari(e.target.value)}
              disabled={busy}
            />
          </Field>
          <SellerPrivateDocPicker multiple busy={busy} onFilesSelected={submit} />
          {errorKey ? <p className="text-xs text-terracotta">{t(`errors.${errorKey}`)}</p> : null}
          <p className="text-xs text-muted">{t('portalNote')}</p>
        </form>
      ) : (
        <p className="text-xs text-muted">{t('awaitingReview')}</p>
      )}

      {!canSubmit && state !== 'verified' ? (
        <Button type="button" variant="outline" disabled={busy} onClick={() => void onRefresh()}>
          {t('refresh')}
        </Button>
      ) : null}
    </section>
  );
}
