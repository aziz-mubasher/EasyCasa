'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';
import { RequireSignInLink } from '@/components/AuthControls';
import { PhoneVerifyPanel } from '@/components/privacy/PhoneVerifyPanel';
import { Link } from '@/i18n/routing';
import './privacy-doc.css';

type RetentionRow = { label: string; period: string };

function decodeJwtEmail(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      email?: string;
      preferred_username?: string;
      name?: string;
    };
    return json.email ?? json.preferred_username ?? json.name ?? null;
  } catch {
    return null;
  }
}

export function MyDataView() {
  const t = useTranslations('myData');
  const { getAccessToken, isAuthenticated, ready } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);
  const retention = t.raw('retentionRows') as RetentionRow[];
  const holdItems = t.raw('holdItems') as string[];

  const [who, setWho] = useState<string | null>(null);
  const [financeShare, setFinanceShare] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [eraseReport, setEraseReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setWho(null);
      return;
    }
    void getAccessToken().then((token) => setWho(decodeJwtEmail(token)));
  }, [getAccessToken, isAuthenticated]);

  async function downloadExport() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(apiUrl('/me/privacy/export'));
      if (!res.ok) throw new Error(t('errors.export', { status: res.status }));
      const data = (await res.json()) as unknown;
      setExportJson(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  async function requestErase() {
    if (!window.confirm(t('erase.confirm'))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(apiUrl('/me/privacy/erase'), { method: 'POST' });
      if (!res.ok) throw new Error(t('errors.erase', { status: res.status }));
      const data = (await res.json()) as unknown;
      setEraseReport(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setBusy(false);
    }
  }

  if (ready && !isAuthenticated) {
    return (
      <div className="pd">
        <div className="pd-wrap pd-wrap--narrow">
          <div className="pd-head" style={{ borderBottom: 0, paddingBottom: '1rem' }}>
            <h1>{t('title')}</h1>
            <p className="pd-sub">{t('signInPrompt')}</p>
          </div>
          <div className="pd-btns" style={{ marginBottom: '3rem' }}>
            <RequireSignInLink />
          </div>
          <p className="pd-footnote">
            {t('footnoteBefore')}{' '}
            <a href="mailto:privacy@easycasaita.com">privacy@easycasaita.com</a>
            {t('footnoteAfter')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pd">
      <div className="pd-wrap pd-wrap--narrow">
        <div className="pd-head" style={{ borderBottom: 0, paddingBottom: '1.6rem' }}>
          <h1>{t('title')}</h1>
          <p className="pd-sub">{t('subtitle')}</p>
          {who ? (
            <p className="pd-meta" style={{ marginTop: '1rem' }}>
              <span>
                {t('signedInAs')} <b>{who}</b>
              </span>
            </p>
          ) : null}
        </div>

        <div className="pd-card">
          <h2>{t('held.title')}</h2>
          <div className="in">
            <div>
              <div className="pd-row">
                <span className="k">{t('held.account')}</span>
                <span className="v">{who ?? t('held.accountSignedIn')}</span>
              </div>
              <div className="pd-row">
                <span className="k">{t('held.enquiries')}</span>
                <span className="v">{t('held.seeExport')}</span>
              </div>
              <div className="pd-row">
                <span className="k">{t('held.viewings')}</span>
                <span className="v">
                  <Link href="/viewings">{t('held.open')}</Link>
                </span>
              </div>
              <div className="pd-row">
                <span className="k">{t('held.searches')}</span>
                <span className="v">
                  <Link href="/favorites">{t('held.open')}</Link>
                </span>
              </div>
              <div className="pd-row">
                <span className="k">{t('held.finance')}</span>
                <span className="v">{t('held.financeValue')}</span>
              </div>
              <div className="pd-row">
                <span className="k">{t('held.consents')}</span>
                <span className="v">{t('held.seeExport')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pd-card">
          <PhoneVerifyPanel />
        </div>

        <div className="pd-card">
          <h2>{t('consents.title')}</h2>
          <div className="in">
            <p className="lead">{t('consents.lead')}</p>

            <div className="pd-cons">
              <div className="top">
                <div>
                  <h3>{t('consents.finance.title')}</h3>
                  <p>{t('consents.finance.body')}</p>
                  <p className="hist">{t('consents.finance.hist')}</p>
                </div>
                <button
                  className="pd-tog"
                  type="button"
                  data-on={financeShare ? 'true' : 'false'}
                  onClick={() => setFinanceShare((v) => !v)}
                >
                  {financeShare ? t('consents.on') : t('consents.off')}
                </button>
              </div>
            </div>

            <div className="pd-cons">
              <div className="top">
                <div>
                  <h3>{t('consents.marketing.title')}</h3>
                  <p>{t('consents.marketing.body')}</p>
                  <p className="hist">{t('consents.marketing.hist')}</p>
                </div>
                <button
                  className="pd-tog"
                  type="button"
                  data-on={marketing ? 'true' : 'false'}
                  onClick={() => setMarketing((v) => !v)}
                >
                  {marketing ? t('consents.on') : t('consents.off')}
                </button>
              </div>
            </div>

            <div className="pd-cons">
              <div className="top">
                <div>
                  <h3>{t('consents.service.title')}</h3>
                  <p>{t('consents.service.body')}</p>
                  <p className="hist">{t('consents.service.hist')}</p>
                </div>
                <span className="pd-locked">{t('consents.locked')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pd-card">
          <h2>{t('export.title')}</h2>
          <div className="in">
            <p className="lead">{t('export.lead')}</p>
            <div className="pd-btns">
              <button className="pd-btn-ink" type="button" disabled={busy} onClick={() => void downloadExport()}>
                {t('export.cta')}
              </button>
            </div>
            {exportJson ? <pre className="pd-pre">{exportJson}</pre> : null}
          </div>
        </div>

        <div className="pd-card">
          <h2>{t('retention.title')}</h2>
          <div className="in">
            <p className="lead">{t('retention.lead')}</p>
            <div className="pd-timeline">
              {retention.map((row) => (
                <div className="t" key={row.label}>
                  <span>{row.label}</span>
                  <span>{row.period}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pd-card">
          <h2>{t('erase.title')}</h2>
          <div className="in">
            <p className="lead">{t('erase.lead')}</p>
            <div className="pd-hold">
              <b>{t('erase.holdTitle')}</b>
              {t('erase.holdIntro')}
              <ul>
                {holdItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="pd-btns" style={{ marginTop: '1.2rem' }}>
              <button
                className="pd-btn-ghost"
                type="button"
                disabled={busy}
                onClick={() => void requestErase()}
              >
                {t('erase.cta')}
              </button>
            </div>
            {eraseReport ? <pre className="pd-pre">{eraseReport}</pre> : null}
          </div>
        </div>

        {error ? (
          <p className="pd-footnote" role="alert">
            {error}
          </p>
        ) : null}

        <p className="pd-footnote">
          {t('footnoteBefore')}{' '}
          <a href="mailto:privacy@easycasaita.com">privacy@easycasaita.com</a>
          {t('footnoteAfter')} ·{' '}
          <Link href="/legal/privacy">{t('policyLink')}</Link>
        </p>
      </div>
    </div>
  );
}
