'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  PROPERTY_TYPES,
  WIZARD_STEPS,
  canSubmit,
  validateStep,
  type ListingDraftPayload,
} from '@easycasa/shared';
import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, TextArea } from '@/components/ui/Field';
import { Link } from '@/i18n/routing';

/**
 * EC-S PR-W — private-seller T07 wizard UI.
 * Autosaves via /listing-drafts; submit creates listing + publish.
 */
export function SellerListingWizard() {
  const t = useTranslations('sellerWizard');
  const locale = useLocale();
  const { ready, isAuthenticated, signIn, getAccessToken } = useAuth();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ListingDraftPayload>({ currentStep: 'basics' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listingId, setListingId] = useState<string | null>(null);
  const [stepCodes, setStepCodes] = useState<string[]>([]);

  const authedFetch = useCallback(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  useEffect(() => {
    if (!ready || !isAuthenticated || draftId) return;
    let cancelled = false;
    void (async () => {
      setBusy(true);
      try {
        const res = await authedFetch()(apiUrl('/listing-drafts'), { method: 'POST' });
        if (!res.ok) {
          setError(res.status === 404 ? t('onboardingRequired') : t('createFailed'));
          return;
        }
        const body = (await res.json()) as { id: string; draft: ListingDraftPayload };
        if (cancelled) return;
        setDraftId(body.id);
        setDraft(body.draft);
      } catch {
        if (!cancelled) setError(t('createFailed'));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, isAuthenticated, draftId, authedFetch, t]);

  const save = async (next: ListingDraftPayload) => {
    if (!draftId) return;
    setDraft(next);
    setError(null);
    const res = await authedFetch()(apiUrl(`/listing-drafts/${draftId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) setError(t('saveFailed'));
  };

  const go = async (dir: 'next' | 'prev') => {
    if (!draftId) return;
    if (dir === 'next') {
      const check = validateStep(draft.currentStep, draft);
      if (!check.ok) {
        setStepCodes(check.codes);
        return;
      }
      setStepCodes([]);
    }
    setBusy(true);
    try {
      const res = await authedFetch()(apiUrl(`/listing-drafts/${draftId}/navigate`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: dir }),
      });
      if (!res.ok) {
        setError(t('navFailed'));
        return;
      }
      const body = (await res.json()) as { draft: ListingDraftPayload };
      setDraft(body.draft);
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!draftId || !canSubmit(draft)) {
      setError(t('notReady'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch()(apiUrl(`/listing-drafts/${draftId}/submit`), {
        method: 'POST',
      });
      if (res.status === 429) {
        setError(t('quotaExceeded'));
        return;
      }
      if (!res.ok) {
        setError(t('submitFailed'));
        return;
      }
      const body = (await res.json()) as { listingId: string };
      setListingId(body.listingId);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">{t('signInTitle')}</h1>
        <Button className="mt-6" onClick={() => void signIn(`/${locale}/seller/list`)}>
          {t('signIn')}
        </Button>
      </div>
    );
  }

  if (listingId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl">{t('publishedTitle')}</h1>
        <p className="mt-2 text-muted">{t('publishedBody')}</p>
        <Link href={`/listings/${listingId}`} className="mt-6 inline-block underline">
          {t('viewListing')}
        </Link>
      </div>
    );
  }

  const step = draft.currentStep;
  const stepIndex = WIZARD_STEPS.indexOf(step);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="data text-xs uppercase tracking-wide text-muted">
        {t('stepOf', { n: stepIndex + 1, total: WIZARD_STEPS.length })}
      </p>
      <h1 className="font-display text-3xl mt-1">{t(`steps.${step}`)}</h1>
      {error ? <p className="mt-4 text-sm text-terracotta">{error}</p> : null}
      {stepCodes.length > 0 ? (
        <ul className="mt-2 text-sm text-terracotta list-disc pl-5">
          {stepCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-8 space-y-4">
        {step === 'basics' ? (
          <>
            <Field label={t('fields.propertyType')}>
              <Select
                value={draft.propertyType ?? ''}
                onChange={(e) => void save({ ...draft, propertyType: e.target.value })}
              >
                <option value="">—</option>
                {PROPERTY_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('fields.title')}>
              <Input
                value={draft.title ?? ''}
                onChange={(e) => void save({ ...draft, title: e.target.value })}
              />
            </Field>
          </>
        ) : null}

        {step === 'address' ? (
          <>
            <Field label={t('fields.address')}>
              <Input
                value={draft.address ?? ''}
                onChange={(e) => void save({ ...draft, address: e.target.value })}
              />
            </Field>
            <Field label={t('fields.city')}>
              <Input
                value={draft.city ?? ''}
                onChange={(e) => void save({ ...draft, city: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('fields.province')}>
                <Input
                  value={draft.province ?? ''}
                  maxLength={2}
                  onChange={(e) => void save({ ...draft, province: e.target.value })}
                />
              </Field>
              <Field label={t('fields.postalCode')}>
                <Input
                  value={draft.postalCode ?? ''}
                  onChange={(e) => void save({ ...draft, postalCode: e.target.value })}
                />
              </Field>
            </div>
          </>
        ) : null}

        {step === 'details' ? (
          <>
            <Field label={t('fields.sqm')}>
              <Input
                type="number"
                value={draft.sqm ?? ''}
                onChange={(e) =>
                  void save({ ...draft, sqm: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Field>
            <Field label={t('fields.rooms')}>
              <Input
                type="number"
                value={draft.rooms ?? ''}
                onChange={(e) =>
                  void save({
                    ...draft,
                    rooms: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Field>
            <Field label={t('fields.bathrooms')}>
              <Input
                type="number"
                value={draft.bathrooms ?? ''}
                onChange={(e) =>
                  void save({
                    ...draft,
                    bathrooms: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </Field>
          </>
        ) : null}

        {step === 'price' ? (
          <Field label={t('fields.price')}>
            <Input
              type="number"
              value={draft.price ?? ''}
              onChange={(e) =>
                void save({
                  ...draft,
                  price: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </Field>
        ) : null}

        {step === 'photos' ? (
          <Field label={t('fields.photoUrls')}>
            <TextArea
              rows={4}
              value={(draft.photoUrls ?? []).join('\n')}
              onChange={(e) =>
                void save({
                  ...draft,
                  photoUrls: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="https://…"
            />
          </Field>
        ) : null}

        {step === 'description' ? (
          <Field label={t('fields.description')}>
            <TextArea
              rows={6}
              value={draft.description ?? ''}
              onChange={(e) => void save({ ...draft, description: e.target.value })}
            />
          </Field>
        ) : null}

        {step === 'review' ? (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(draft.acceptedTerms)}
              onChange={(e) => void save({ ...draft, acceptedTerms: e.target.checked })}
            />
            <span>{t('fields.acceptedTerms')}</span>
          </label>
        ) : null}
      </div>

      <div className="mt-10 flex gap-3">
        <Button
          variant="ghost"
          disabled={busy || step === 'basics'}
          onClick={() => void go('prev')}
        >
          {t('back')}
        </Button>
        {step !== 'review' ? (
          <Button disabled={busy} onClick={() => void go('next')}>
            {t('next')}
          </Button>
        ) : (
          <Button disabled={busy || !canSubmit(draft)} onClick={() => void submit()}>
            {t('publish')}
          </Button>
        )}
      </div>
    </div>
  );
}
