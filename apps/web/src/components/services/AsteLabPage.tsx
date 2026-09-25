'use client';

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/auth/AuthProvider';
import { tokenStore } from '@/auth/tokenStore';
import type { AsteLabGateState } from '@/lib/aste-access-server';
import './aste-lab.css';

type Props = { gate: AsteLabGateState };

function FlagRow({ on, label }: { on: boolean; label: string }) {
  return (
    <li className={on ? 'alab-flag alab-flag--on' : 'alab-flag alab-flag--off'}>
      <span className="alab-flag-dot" aria-hidden />
      <span>
        <strong>{label}</strong>
        <em>{on ? 'on' : 'off'}</em>
      </span>
    </li>
  );
}

export function AsteLabPage({ gate }: Props) {
  const t = useTranslations('asteLab');
  const locale = useLocale();
  const router = useRouter();
  const { ready, isAuthenticated, signIn, getAccessToken } = useAuth();
  const refreshedForSession = useRef(false);

  // After client login, remirror ec_access and refresh RSC props so gate flags update.
  // Force one token refresh so Keycloak re-issues claims (email mappers) into the access JWT.
  useEffect(() => {
    if (!ready || !isAuthenticated) {
      refreshedForSession.current = false;
      return;
    }
    if (gate.canOpenAnalisi || gate.sessionAllowlisted) return;
    if (refreshedForSession.current) return;
    refreshedForSession.current = true;
    void (async () => {
      const stored = tokenStore.getTokens();
      if (stored?.refreshToken) {
        // Nudge expiry so getAccessToken refreshes and picks up email claim mappers.
        tokenStore.setTokens({ ...stored, expiresAt: Date.now() });
      }
      await getAccessToken();
      tokenStore.getTokens();
      router.refresh();
    })();
  }, [
    ready,
    isAuthenticated,
    gate.canOpenAnalisi,
    gate.sessionAllowlisted,
    getAccessToken,
    router,
  ]);

  const checklist = t.raw('checklist.items') as string[];
  const paywallItems = t.raw('paywall.items') as string[];

  return (
    <main className="alab">
      <header className="alab-hero">
        <div className="alab-wrap">
          <p className="alab-brand">EasyCasa</p>
          <span className="alab-badge">{t('badge')}</span>
          <h1>{t('title')}</h1>
          <p className="alab-lead">{t('lead')}</p>
        </div>
      </header>

      <div className="alab-body alab-wrap">
        <section className="alab-card" aria-labelledby="alab-gate-h">
          <h2 id="alab-gate-h">{t('gate.title')}</h2>
          <p className="alab-muted">{t('gate.hint')}</p>
          <ul className="alab-flags">
            <FlagRow on={gate.publicEnabled} label={t('gate.public')} />
            <FlagRow on={gate.previewBuildMounted} label={t('gate.previewBuild')} />
            <FlagRow on={gate.previewRuntimeOn} label={t('gate.previewRuntime')} />
            <FlagRow on={gate.allowlistConfigured} label={t('gate.allowlist')} />
            <FlagRow on={gate.signedIn} label={t('gate.signedIn')} />
            <FlagRow on={gate.sessionAllowlisted} label={t('gate.sessionAllowlisted')} />
            <FlagRow on={gate.canOpenAnalisi} label={t('gate.canOpenAnalisi')} />
            <FlagRow on={gate.monetisationEnabled} label={t('gate.monetisation')} />
          </ul>
          {gate.publicEnabled ? (
            <p className="alab-warn" role="status">
              {t('gate.publicWarn')}
            </p>
          ) : null}
        </section>

        <section className="alab-card" aria-labelledby="alab-actions-h">
          <h2 id="alab-actions-h">{t('actions.title')}</h2>
          <p>{gate.canOpenAnalisi ? t('actions.ready') : t('actions.blocked')}</p>
          <div className="alab-actions">
            {gate.canOpenAnalisi ? (
              <Link className="alab-btn alab-btn--primary" href="/aste/analisi">
                {t('actions.openAnalisi')}
              </Link>
            ) : ready && !isAuthenticated ? (
              <button
                type="button"
                className="alab-btn alab-btn--primary"
                onClick={() => void signIn(`/${locale}/aste/lab`)}
              >
                {t('actions.signIn')}
              </button>
            ) : (
              <span className="alab-btn alab-btn--disabled" aria-disabled="true">
                {t('actions.openAnalisi')}
              </span>
            )}
            <Link className="alab-btn alab-btn--ghost" href="/aste">
              {t('actions.backLanding')}
            </Link>
          </div>
        </section>

        <section className="alab-card" aria-labelledby="alab-check-h">
          <h2 id="alab-check-h">{t('checklist.title')}</h2>
          <p className="alab-muted">{t('checklist.hint')}</p>
          <ol className="alab-steps">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section className="alab-card" aria-labelledby="alab-pay-h">
          <h2 id="alab-pay-h">{t('paywall.title')}</h2>
          {gate.monetisationEnabled ? (
            <>
              <p>{t('paywall.ready')}</p>
              <ol className="alab-steps">
                {paywallItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </>
          ) : (
            <p className="alab-muted">{t('paywall.off')}</p>
          )}
        </section>

        <section className="alab-card" aria-labelledby="alab-out-h">
          <h2 id="alab-out-h">{t('outOfScope.title')}</h2>
          <ul className="alab-out">
            <li>{t('outOfScope.laneB')}</li>
            <li>{t('outOfScope.laneE')}</li>
          </ul>
          <p className="alab-muted">
            {t('outOfScope.sop')} <code>docs/runbooks/aste-testing-sop.md</code>
          </p>
        </section>
      </div>
    </main>
  );
}
