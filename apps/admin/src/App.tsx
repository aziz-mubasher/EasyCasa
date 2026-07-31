import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from './auth/AuthProvider';
import { adminRolesFromAccessToken, canAccessView } from './auth/roles';
import { Orchestration } from './pages/Orchestration';
import { Credentials } from './pages/Credentials';
import { ComplianceConfig } from './pages/ComplianceConfig';
import { CoverageMatrix } from './pages/CoverageMatrix';
import { AmlCases } from './pages/AmlCases';
import { RliMonitor } from './pages/RliMonitor';
import { DsarQueue } from './pages/DsarQueue';
import { ListingTakedown } from './pages/ListingTakedown';
import { IdentityReview } from './pages/IdentityReview';
import { WhatsAppInbound } from './pages/WhatsAppInbound';

type View =
  | 'credentials'
  | 'coverage'
  | 'dsar'
  | 'takedown'
  | 'identity'
  | 'whatsapp'
  | 'orchestration'
  | 'compliance'
  | 'aml'
  | 'rli';

const NAV: { key: View; label: string; hint: string }[] = [
  { key: 'credentials', label: 'Credentials', hint: 'Ops · expiring first' },
  { key: 'coverage', label: 'Coverage', hint: 'Ops / support read' },
  { key: 'dsar', label: 'DSAR', hint: 'DPO only' },
  { key: 'takedown', label: 'Takedown', hint: 'DSA reports' },
  { key: 'identity', label: 'Identity', hint: 'Manual verify' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'Inbound · audited' },
  { key: 'orchestration', label: 'Orchestration', hint: 'Assign tasks' },
  { key: 'compliance', label: 'Compliance', hint: 'Legal basis' },
  { key: 'aml', label: 'AML / KYC', hint: 'Risk cases' },
  { key: 'rli', label: 'RLI monitor', hint: 'Lease deadlines' },
];

const VIEWS: Record<View, React.ReactNode> = {
  credentials: <Credentials />,
  coverage: <CoverageMatrix />,
  dsar: <DsarQueue />,
  takedown: <ListingTakedown />,
  identity: <IdentityReview />,
  whatsapp: <WhatsAppInbound />,
  orchestration: <Orchestration />,
  compliance: <ComplianceConfig />,
  aml: <AmlCases />,
  rli: <RliMonitor />,
};

function BrandMark({ className = 'brand__mark' }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      E<span>.</span>
    </div>
  );
}

function LoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isConfigured, signIn } = useAuth();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  if (!isConfigured) {
    return (
      <div className="login login--plain">
        <div className="login__panel">
          <p className="login__eyebrow">EasyCasa · Back office</p>
          <div className="login__brand">
            <BrandMark className="login__mark" />
            <p className="login__wordmark">EasyCasa</p>
          </div>
          <h1 className="login__title">OIDC not configured</h1>
          <p className="login__copy">
            Set <code className="mono">VITE_OIDC_ISSUER</code> and{' '}
            <code className="mono">VITE_OIDC_CLIENT_ID</code>, then rebuild the admin image.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login__panel">
        <p className="login__eyebrow">Back office</p>
        <div className="login__brand">
          <BrandMark className="login__mark" />
          <p className="login__wordmark">EasyCasa</p>
        </div>
        <h1 className="login__title">Sign in to continue</h1>
        <p className="login__copy">
          Operations, compliance, and support for the EasyCasa Italia platform.
        </p>
        <button type="button" className="btn btn--primary login__cta" onClick={() => void signIn()}>
          Sign in with admin account
        </button>
        <p className="login__foot">
          <a href="https://easycasaita.com" target="_blank" rel="noreferrer">
            easycasaita.com
          </a>
        </p>
      </div>
    </div>
  );
}

function BuildMarker() {
  const [sha, setSha] = useState<string>('…');
  useEffect(() => {
    const baked = import.meta.env.VITE_GIT_SHA as string | undefined;
    if (baked?.trim()) {
      setSha(baked.trim());
      return;
    }
    const base = import.meta.env.VITE_API_BASE_URL ?? 'https://easycasaita.com/api';
    void fetch(`${base.replace(/\/$/, '')}/version`)
      .then((r) => r.json())
      .then((j: { gitSha?: string }) => setSha(j.gitSha ?? 'unknown'))
      .catch(() => setSha('unknown'));
  }, []);
  return (
    <p className="muted mono" style={{ margin: '0.75rem 0 0' }}>
      build {sha}
    </p>
  );
}

export function App() {
  const { isAuthenticated, signOut, accessToken } = useAuth();
  const adminRoles = useMemo(() => adminRolesFromAccessToken(accessToken), [accessToken]);
  const allowedNav = useMemo(
    () => NAV.filter((n) => canAccessView(adminRoles, n.key)),
    [adminRoles],
  );
  const initialView = ((): View => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.replace(/^#/, '');
      if (h === 'whatsapp' || h.startsWith('whatsapp/')) return 'whatsapp';
    }
    return 'credentials';
  })();
  const [view, setView] = useState<View>(initialView);

  const activeView = allowedNav.some((n) => n.key === view)
    ? view
    : (allowedNav[0]?.key ?? null);

  function go(next: View) {
    setView(next);
    if (typeof window !== 'undefined') {
      if (next === 'whatsapp') {
        const cur = window.location.hash.replace(/^#/, '');
        if (!cur.startsWith('whatsapp')) window.location.hash = 'whatsapp';
      } else {
        window.location.hash = '';
      }
    }
  }

  return (
    <LoginGate>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <BrandMark />
            <div className="brand__text">
              <span className="brand__name">EasyCasa</span>
              <span className="brand__tag">Back office</span>
            </div>
          </div>
          {isAuthenticated ? (
            <button type="button" className="nav-item" onClick={() => void signOut()}>
              <span className="nav-item__label">Sign out</span>
              <span className="nav-item__hint">End session</span>
            </button>
          ) : null}
          <nav>
            {allowedNav.map((n) => (
              <button
                key={n.key}
                className={`nav-item${activeView === n.key ? ' nav-item--active' : ''}`}
                onClick={() => go(n.key)}
              >
                <span className="nav-item__label">{n.label}</span>
                <span className="nav-item__hint">{n.hint}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar__foot">
            <BuildMarker />
          </div>
        </aside>
        <main className="content">
          {activeView ? (
            VIEWS[activeView]
          ) : (
            <p>
              No admin role on this account. Ask an operator to assign an{' '}
              <code className="mono">admin_*</code> realm role in Keycloak. Bare{' '}
              <code className="mono">admin</code> is not enough.
            </p>
          )}
        </main>
      </div>
    </LoginGate>
  );
}
