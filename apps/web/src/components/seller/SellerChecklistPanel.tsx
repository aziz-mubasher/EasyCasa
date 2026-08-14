'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SellerChecklistTypeCode } from '@easycasa/shared';

import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';
import {
  checklistTypeCodes,
  slotHasDoc,
  type ChecklistWire,
} from '@/lib/seller-trust';

import { SellerPrivateDocPicker } from './SellerPrivateDocPicker';

type Props = {
  listingId: string;
  loading: boolean;
  flagOff: boolean;
  data: ChecklistWire | null;
  onRefresh: () => Promise<void>;
};

/** PP-6 — per-slot checklist upload/replace/remove + completeness score. */
export function SellerChecklistPanel({
  listingId,
  loading,
  flagOff,
  data,
  onRefresh,
}: Props) {
  const t = useTranslations('sellerTrust.checklist');
  const { getAccessToken } = useAuth();
  const [busySlot, setBusySlot] = useState<SellerChecklistTypeCode | null>(null);
  const [errorKey, setErrorKey] = useState<'uploadFailed' | 'removeFailed' | null>(null);

  if (flagOff) return null;
  if (loading && !data) {
    return <p className="text-sm text-muted">{t('loading')}</p>;
  }

  const score = data?.score ?? { have: 0, total: checklistTypeCodes().length };
  const items = data?.items ?? [];

  const attach = async (typeCode: SellerChecklistTypeCode, files: File[]) => {
    const file = files[0];
    if (!file) return;
    setBusySlot(typeCode);
    setErrorKey(null);
    try {
      const form = new FormData();
      form.append('typeCode', typeCode);
      form.append('file', file);
      const res = await createAuthedFetch(getAccessToken)(
        apiUrl(`/seller/checklist/${listingId}/docs`),
        { method: 'POST', body: form },
      );
      if (!res.ok) {
        setErrorKey('uploadFailed');
        return;
      }
      await onRefresh();
    } catch {
      setErrorKey('uploadFailed');
    } finally {
      setBusySlot(null);
    }
  };

  const remove = async (typeCode: SellerChecklistTypeCode) => {
    setBusySlot(typeCode);
    setErrorKey(null);
    try {
      const res = await createAuthedFetch(getAccessToken)(
        apiUrl(`/seller/checklist/${listingId}/docs/remove`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ typeCode }),
        },
      );
      if (!res.ok) {
        setErrorKey('removeFailed');
        return;
      }
      await onRefresh();
    } catch {
      setErrorKey('removeFailed');
    } finally {
      setBusySlot(null);
    }
  };

  return (
    <section
      className="rounded-xl2 border border-line bg-paper p-5 space-y-4"
      data-testid="seller-checklist-panel"
    >
      <header>
        <h2 className="font-display text-xl">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('lead')}</p>
        <p className="mt-2 text-sm font-medium text-ink" data-testid="checklist-score">
          {t('score', score)}
        </p>
      </header>

      <ul className="space-y-4">
        {items.map((item) => {
          const attached = slotHasDoc(item);
          const busy = busySlot === item.typeCode;
          return (
            <li
              key={item.typeCode}
              className="rounded-lg border border-line p-4 space-y-3"
              data-testid={`checklist-slot-${item.typeCode}`}
            >
              <div>
                <p className="text-sm font-medium text-ink">{t(`slots.${item.typeCode}.title`)}</p>
                <p className="text-xs text-muted">{t(`slots.${item.typeCode}.hint`)}</p>
              </div>
              <p className="text-xs text-muted">
                {attached ? t('slotAttached') : t('slotEmpty')}
              </p>
              <SellerPrivateDocPicker
                busy={busy}
                disabled={busy}
                onFilesSelected={(files) => attach(item.typeCode, files)}
              />
              {attached ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs"
                  disabled={busy}
                  onClick={() => void remove(item.typeCode)}
                >
                  {busy ? t('working') : t('remove')}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {errorKey ? <p className="text-xs text-terracotta">{t(`errors.${errorKey}`)}</p> : null}
      <p className="text-xs text-muted">{t('privateNote')}</p>
    </section>
  );
}
