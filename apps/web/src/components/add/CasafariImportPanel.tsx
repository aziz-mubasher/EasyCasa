'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { apiUrl } from '@/auth/authedFetch';

export type CasafariImportDraft = {
  casafariId: string;
  sourceUrl: string;
  propertyUrl: string;
  title: string;
  description: string;
  price: number | null;
  rentPrice: number | null;
  transactionTypes: string[];
  assetClass: string;
  propertyType: string | null;
  condition: string | null;
  sellerType: 'private' | 'agency';
  features: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  rooms: number | null;
  sizeSqm: number | null;
  surfaceSqm: number | null;
  landSqm: number | null;
  yearBuilt: number | null;
  energyClass: string | null;
  floor: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrls: string[];
  listingSource: string;
  listingUrls: string[];
  sellerLabel: string;
  missingRequired: string[];
};

type PreviewResponse = {
  draftCount: number;
  isShareFolder: boolean;
  drafts: CasafariImportDraft[];
};

type CreateResponse = {
  listing: { id: string; slug: string | null; status: string };
  draft: CasafariImportDraft;
  imagesImported: number;
  imageErrors: string[];
};

type Props = {
  authedFetch: typeof fetch;
  province: string;
  onApplyToForm: (draft: CasafariImportDraft) => void;
  onImported: (result: CreateResponse) => void;
};

export function CasafariImportPanel({
  authedFetch,
  province,
  onApplyToForm,
  onImported,
}: Props) {
  const t = useTranslations('add.casafari');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected =
    preview?.drafts.find((d) => d.casafariId === selectedId) ?? preview?.drafts[0] ?? null;

  const runPreview = async () => {
    setError(null);
    setBusy('preview');
    try {
      const res = await authedFetch(apiUrl('/imports/casafari/preview'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), maxImages: 20 }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `preview failed: ${res.status}`);
      }
      const data = (await res.json()) as PreviewResponse;
      setPreview(data);
      setSelectedId(data.drafts[0]?.casafariId ?? null);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : t('errors.preview'));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    if (!selected) return;
    setError(null);
    setBusy('import');
    try {
      const body: Record<string, unknown> = {
        url: url.trim(),
        maxImages: 20,
      };
      if (selected.casafariId) body.casafariId = selected.casafariId;
      const provinceSigla = province.trim() || selected.province || '';
      if (provinceSigla) body.province = provinceSigla;
      const res = await authedFetch(apiUrl('/imports/casafari/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text || `import failed: ${res.status}`;
        try {
          const parsed = JSON.parse(text) as { message?: string | string[]; error?: string };
          if (Array.isArray(parsed.message)) message = parsed.message.join('; ');
          else if (typeof parsed.message === 'string') message = parsed.message;
          else if (parsed.error) message = parsed.error;
        } catch {
          /* keep raw text */
        }
        throw new Error(message);
      }
      const data = (await res.json()) as CreateResponse;
      onImported(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.import'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl2 border border-azure/30 bg-azure/5 p-5 space-y-4 mb-6">
      <div>
        <p className="text-sm font-medium text-ink">{t('title')}</p>
        <p className="text-sm text-muted mt-1">{t('body')}</p>
      </div>
      <Field label={t('urlLabel')} hint={t('urlHint')}>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.casafari.com/estate/sharepage/…"
          inputMode="url"
          autoComplete="off"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!url.trim() || busy !== null}
          onClick={() => void runPreview()}
        >
          {busy === 'preview' ? t('previewing') : t('preview')}
        </Button>
        {selected && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => onApplyToForm(selected)}
            >
              {t('applyToForm')}
            </Button>
            <Button type="button" disabled={busy !== null} onClick={() => void runImport()}>
              {busy === 'import' ? t('importing') : t('importDraft')}
            </Button>
          </>
        )}
      </div>
      {error && (
        <p className="text-sm text-terracotta" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {preview.isShareFolder
              ? t('folderCount', { n: preview.draftCount })
              : t('singleCount')}
          </p>
          <ul className="space-y-2">
            {preview.drafts.map((d) => {
              const active = (selectedId ?? preview.drafts[0]?.casafariId) === d.casafariId;
              return (
                <li key={d.casafariId || d.title}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.casafariId)}
                    className={`w-full text-left rounded-lg border p-3 transition ${
                      active ? 'border-azure bg-white' : 'border-line bg-white/60 hover:border-ink'
                    }`}
                  >
                    <div className="flex gap-3">
                      {d.photoUrls[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={d.photoUrls[0]}
                          alt=""
                          className="h-16 w-20 rounded object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-20 rounded bg-line shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{d.title}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {d.price != null ? `€${d.price.toLocaleString('it-IT')}` : '—'}
                          {d.city ? ` · ${d.city}` : ''}
                          {` · ${d.photoUrls.length} ${t('photos')}`}
                        </p>
                        {d.missingRequired.length > 0 && (
                          <p className="text-xs text-terracotta mt-1">
                            {t('missing', { fields: d.missingRequired.join(', ') })}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
