'use client';

import { useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/auth/AuthProvider';
import {
  createAnalysis,
  deleteAnalysis,
  getAnalysis,
  submitAnalysis,
  uploadDocument,
  type AsteAnalysis,
  type DocType,
} from '@/lib/aste-analysis-api';
import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';
import './aste-analisi.css';

const DOC_TYPES: DocType[] = ['perizia', 'avviso', 'ordinanza', 'planimetria', 'altro'];

export function AsteAnalisiPage() {
  const t = useTranslations('asteAnalisi');
  const locale = useLocale() as 'it' | 'en' | 'es';
  const id = useId();
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();

  const [register, setRegister] = useState<'investor' | 'first_buyer'>('first_buyer');
  const [analysis, setAnalysis] = useState<AsteAnalysis | null>(null);
  const [docType, setDocType] = useState<DocType>('perizia');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      await signIn(`/${locale}/aste/analisi`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = await createAnalysis(getAccessToken, { language: locale, register });
      trackProduct(PRODUCT_EVENTS.ASTE_ANALYSIS_CREATED, { language: locale, register });
      setAnalysis(await getAnalysis(getAccessToken, row.id));
    } catch {
      setError(t('errors.create'));
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    if (!analysis || !files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadDocument(getAccessToken, analysis.id, file, docType);
        trackProduct(PRODUCT_EVENTS.ASTE_DOCUMENT_UPLOADED, { docType });
      }
      setAnalysis(await getAnalysis(getAccessToken, analysis.id));
      setFiles(null);
    } catch {
      setError(t('errors.upload'));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!analysis) return;
    setBusy(true);
    setError(null);
    try {
      const row = await submitAnalysis(getAccessToken, analysis.id);
      trackProduct(PRODUCT_EVENTS.ASTE_ANALYSIS_SUBMITTED, { language: locale });
      setAnalysis(await getAnalysis(getAccessToken, row.id));
    } catch {
      setError(t('errors.submit'));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!analysis) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAnalysis(getAccessToken, analysis.id);
      trackProduct(PRODUCT_EVENTS.ASTE_ANALYSIS_DELETED, { language: locale });
      setAnalysis(null);
    } catch {
      setError(t('errors.delete'));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="aa">
        <div className="aa-wrap">
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="aa">
      <header className="aa-hero">
        <div className="aa-wrap">
          <p className="aa-brand">EasyCasa</p>
          <p className="aa-badge">{t('badge')}</p>
          <h1>{t('title')}</h1>
          <p className="aa-lead">{t('lead')}</p>
        </div>
      </header>

      <div className="aa-wrap aa-body">
        {error ? (
          <p className="aa-error" role="alert">
            {error}
          </p>
        ) : null}

        {!analysis ? (
          <form className="aa-card" onSubmit={onCreate}>
            <h2>{t('create.title')}</h2>
            <p>{t('create.sub')}</p>
            <div className="aa-field">
              <label htmlFor={`${id}-register`}>{t('create.register')}</label>
              <select
                id={`${id}-register`}
                value={register}
                onChange={(e) => setRegister(e.target.value as 'investor' | 'first_buyer')}
              >
                <option value="first_buyer">{t('create.registerFirst')}</option>
                <option value="investor">{t('create.registerInvestor')}</option>
              </select>
            </div>
            <button className="aa-btn" type="submit" disabled={busy}>
              {!isAuthenticated ? t('create.signIn') : t('create.submit')}
            </button>
          </form>
        ) : (
          <>
            <section className="aa-card" aria-labelledby={`${id}-status`}>
              <h2 id={`${id}-status`}>{t('status.title')}</h2>
              <p>
                <span className="aa-mono">{t('status.label')}</span>{' '}
                <strong>{t(`status.${analysis.status}` as 'status.draft')}</strong>
              </p>
              {analysis.status === 'uploaded' || analysis.status === 'processing' ? (
                <p className="aa-note">{t('status.preparing')}</p>
              ) : null}
            </section>

            {analysis.status === 'draft' ? (
              <form className="aa-card" onSubmit={onUpload}>
                <h2>{t('upload.title')}</h2>
                <p>{t('upload.sub')}</p>
                <div className="aa-field">
                  <label htmlFor={`${id}-doctype`}>{t('upload.docType')}</label>
                  <select
                    id={`${id}-doctype`}
                    value={docType}
                    onChange={(e) => setDocType(e.target.value as DocType)}
                  >
                    {DOC_TYPES.map((dt) => (
                      <option key={dt} value={dt}>
                        {t(`upload.types.${dt}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="aa-field">
                  <label htmlFor={`${id}-files`}>{t('upload.files')}</label>
                  <input
                    id={`${id}-files`}
                    type="file"
                    accept=".pdf,image/jpeg,image/png,application/pdf"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                  />
                  <p className="aa-hint">{t('upload.hint')}</p>
                </div>
                <button className="aa-btn" type="submit" disabled={busy || !files?.length}>
                  {t('upload.submit')}
                </button>
              </form>
            ) : null}

            <section className="aa-card" aria-labelledby={`${id}-docs`}>
              <h2 id={`${id}-docs`}>{t('docs.title')}</h2>
              {!analysis.documents?.length ? (
                <p>{t('docs.empty')}</p>
              ) : (
                <ul className="aa-docs">
                  {analysis.documents.map((d) => (
                    <li key={d.id}>
                      <span className="aa-mono">{d.docType}</span> — {d.originalFilename}{' '}
                      <span className="aa-muted">({Math.round(d.sizeBytes / 1024)} KB)</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="aa-actions">
              {analysis.status === 'draft' ? (
                <button
                  className="aa-btn"
                  type="button"
                  disabled={busy || !analysis.documents?.length}
                  onClick={() => void onSubmit()}
                >
                  {t('actions.submit')}
                </button>
              ) : null}
              {analysis.status === 'ready' ? (
                <Link className="aa-btn" href={`/aste/analisi/${analysis.id}/report`}>
                  {t('actions.openReport')}
                </Link>
              ) : null}
              <button
                className="aa-btn aa-btn--ghost"
                type="button"
                disabled={busy}
                onClick={() => void onDelete()}
              >
                {t('actions.delete')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
