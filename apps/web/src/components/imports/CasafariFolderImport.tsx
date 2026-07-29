'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { useAuth } from '@/auth/AuthProvider';
import { useCanImportCasafari } from '@/auth/useCanImportCasafari';
import type { CasafariImportDraft } from '@/components/add/CasafariImportPanel';

type PreviewResponse = {
  draftCount: number;
  isShareFolder: boolean;
  drafts: CasafariImportDraft[];
};

type CreateManyResponse = {
  imported: number;
  failed: number;
  published: number;
  results: Array<{
    casafariId: string;
    ok: boolean;
    listingId?: string;
    slug?: string | null;
    title?: string;
    imagesImported?: number;
    imageErrors?: string[];
    published?: boolean;
    error?: string;
  }>;
};

function formatPrice(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function CasafariFolderImport() {
  const t = useTranslations('casafariImport');
  const { ready: authReady, isAuthenticated, signIn, getAccessToken } = useAuth();
  const { ready: gateReady, canImport } = useCanImportCasafari();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [url, setUrl] = useState('');
  const [province, setProvince] = useState('');
  const [publishAfter, setPublishAfter] = useState(false);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<CreateManyResponse | null>(null);

  const allIds = useMemo(
    () => (preview?.drafts ?? []).map((d) => d.casafariId).filter(Boolean),
    [preview],
  );

  const selectedCount = selected.size;
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onPreview = async () => {
    setBusy('preview');
    setError(null);
    setResults(null);
    setPreview(null);
    setSelected(new Set());
    try {
      const res = await authedFetch(apiUrl('/imports/casafari/preview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          maxImages: 20,
          refreshCache: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const msg = Array.isArray(body?.message)
          ? body.message.join(', ')
          : body?.message || t('errors.preview');
        throw new Error(msg);
      }
      const data = (await res.json()) as PreviewResponse;
      setPreview(data);
      setSelected(new Set(data.drafts.map((d) => d.casafariId).filter(Boolean)));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.preview'));
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    if (!preview || selectedCount === 0) return;
    if (publishAfter) {
      const ok = window.confirm(t('confirmPublish', { n: selectedCount }));
      if (!ok) return;
    }
    setBusy('import');
    setError(null);
    setResults(null);
    try {
      const res = await authedFetch(apiUrl('/imports/casafari/create-many'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          casafariIds: [...selected],
          maxImages: 20,
          refreshCache: false,
          province: province.trim() || undefined,
          publish: publishAfter,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
        const msg = Array.isArray(body?.message)
          ? body.message.join(', ')
          : body?.message || t('errors.import');
        throw new Error(msg);
      }
      const data = (await res.json()) as CreateManyResponse;
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.import'));
    } finally {
      setBusy(null);
    }
  };

  if (!authReady || !gateReady) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-sm text-muted">{t('loading')}</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold mb-3">{t('title')}</h1>
        <p className="text-muted mb-6">{t('signInRequired')}</p>
        <Button type="button" onClick={() => void signIn()}>
          {t('signIn')}
        </Button>
      </section>
    );
  }

  if (!canImport) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold mb-3">{t('title')}</h1>
        <p className="text-muted">{t('accessDenied')}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-5 py-12">
      <p className="eyebrow mb-2">{t('eyebrow')}</p>
      <h1 className="font-display text-3xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-sm text-muted mb-8">{t('subtitle')}</p>

      <div className="space-y-4 rounded-xl border border-line bg-white p-5">
        <Field label={t('urlLabel')} hint={t('urlHint')}>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.casafari.com/estate/sharepage/…"
            disabled={busy !== null}
          />
        </Field>
        <Field label={t('provinceLabel')} hint={t('provinceHint')}>
          <Input
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            placeholder="BS"
            disabled={busy !== null}
          />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={publishAfter}
            onChange={(e) => setPublishAfter(e.target.checked)}
            disabled={busy !== null}
          />
          <span>
            <span className="font-medium">{t('publishLabel')}</span>
            <span className="block text-xs text-muted mt-0.5">{t('publishHint')}</span>
          </span>
        </label>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => void onPreview()}
            disabled={busy !== null || url.trim().length < 12}
          >
            {busy === 'preview' ? t('previewing') : t('preview')}
          </Button>
          {preview && (
            <Button
              type="button"
              onClick={() => void onImport()}
              disabled={busy !== null || selectedCount === 0}
            >
              {busy === 'import'
                ? t('importing')
                : publishAfter
                  ? t('importAndPublish', { n: selectedCount })
                  : t('importSelected', { n: selectedCount })}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 p-3">
          {error}
        </p>
      )}

      {preview && (
        <div className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-medium">
              {preview.isShareFolder
                ? t('folderCount', { n: preview.draftCount })
                : t('singleCount')}
            </p>
            <button
              type="button"
              className="text-sm text-azure underline hover:no-underline"
              onClick={toggleAll}
            >
              {allSelected ? t('deselectAll') : t('selectAll')}
            </button>
          </div>

          <ul className="space-y-3">
            {preview.drafts.map((d) => {
              const id = d.casafariId;
              const checked = selected.has(id);
              const thumb = d.photoUrls[0];
              return (
                <li
                  key={id || d.title}
                  className="flex gap-3 rounded-xl border border-line bg-white p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={checked}
                    onChange={() => toggleOne(id)}
                    disabled={busy !== null || !id}
                    aria-label={d.title}
                  />
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      className="h-20 w-28 shrink-0 rounded-md object-cover bg-mist"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-20 w-28 shrink-0 rounded-md bg-mist" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{d.title}</p>
                    <p className="text-sm text-muted">
                      {[d.city, d.propertyType, formatPrice(d.price ?? d.rentPrice)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {t('photoCount', { n: d.photoUrls.length })}
                      {d.missingRequired.length > 0
                        ? ` · ${t('missing', { fields: d.missingRequired.join(', ') })}`
                        : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {results && (
        <div className="mt-8 rounded-xl border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold mb-2">{t('resultsTitle')}</h2>
          <p className="text-sm text-muted mb-4">
            {t('resultsSummary', {
              ok: results.imported,
              fail: results.failed,
              published: results.published ?? 0,
            })}
          </p>
          <ul className="space-y-2 text-sm">
            {results.results.map((r) => (
              <li
                key={r.casafariId}
                className={
                  r.ok
                    ? 'rounded-lg border border-line px-3 py-2'
                    : 'rounded-lg border border-red-200 bg-red-50 px-3 py-2'
                }
              >
                {r.ok ? (
                  <>
                    <span className="font-medium">{r.title ?? r.casafariId}</span>
                    {' — '}
                    {t('importedPhotos', { n: r.imagesImported ?? 0 })}
                    {r.published ? ` · ${t('publishedBadge')}` : ` · ${t('draftBadge')}`}
                    {r.imageErrors && r.imageErrors.length > 0 ? (
                      <span className="block text-xs text-amber-800 mt-1">
                        {t('imageWarnings', { n: r.imageErrors.length })}
                      </span>
                    ) : null}
                    {r.listingId ? (
                      <>
                        {' · '}
                        <Link
                          href={
                            r.published
                              ? `/listings/${r.slug || r.listingId}`
                              : `/listings/${r.listingId}/availability`
                          }
                          className="text-azure underline hover:no-underline"
                        >
                          {r.published ? t('openListing') : t('openDraft')}
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <span className="font-medium">{r.title ?? r.casafariId}</span>
                    {': '}
                    {r.error ?? t('errors.import')}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
