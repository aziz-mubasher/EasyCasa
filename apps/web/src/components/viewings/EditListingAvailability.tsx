'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { defaultAvailabilityWindows, type AvailabilityWindow } from '@easycasa/shared';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { AvailabilityWindowsEditor } from '@/components/viewings/AvailabilityWindowsEditor';
import { Link } from '@/i18n/routing';
import { useViewingsApi } from '@/lib/viewings-api';

type Props = {
  listingId: string;
};

export function EditListingAvailability({ listingId }: Props) {
  const t = useTranslations('availability');
  const ta = useTranslations('add');
  const { ready, isAuthenticated, signIn } = useAuth();
  const api = useViewingsApi();
  const [windows, setWindows] = useState<AvailabilityWindow[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    let cancelled = false;
    void api
      .getAvailability(listingId)
      .then((rows) => {
        if (!cancelled) setWindows(rows.length ? rows : defaultAvailabilityWindows());
      })
      .catch(() => {
        if (!cancelled) setWindows(defaultAvailabilityWindows());
      });
    return () => {
      cancelled = true;
    };
  }, [api, listingId, ready, isAuthenticated]);

  const canSave = useMemo(() => windows !== null && status !== 'saving', [windows, status]);

  async function onSave() {
    if (!windows) return;
    setStatus('saving');
    setError(null);
    try {
      await api.setAvailability(listingId, windows, 'edit');
      setStatus('ok');
    } catch {
      setStatus('err');
      setError(t('saveFailed'));
    }
  }

  if (!ready) {
    return <p className="text-muted text-sm">{ta('loading')}</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <p className="text-muted text-sm">{t('signInRequired')}</p>
        <Button onClick={() => void signIn()}>{ta('signInToContinue')}</Button>
      </div>
    );
  }

  if (windows === null) {
    return <p className="text-muted text-sm">{ta('loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <AvailabilityWindowsEditor windows={windows} onChange={setWindows} />
      <div className="flex flex-wrap gap-3 items-center">
        <Button disabled={!canSave} onClick={() => void onSave()}>
          {status === 'saving' ? t('saving') : t('save')}
        </Button>
        <Link href={`/listings/${listingId}`} className="text-sm text-azure underline">
          {t('backToListing')}
        </Link>
      </div>
      {status === 'ok' ? (
        <p className="text-sm text-pine" role="status">
          {t('saved')}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-muted" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
