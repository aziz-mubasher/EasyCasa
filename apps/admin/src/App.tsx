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

type View =
  | 'credentials'
  | 'coverage'
  | 'dsar'
  | 'takedown'
  | 'identity'
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
  orchestration: <Orchestration />,
  compliance: <ComplianceConfig />,
  aml: <AmlCases />,
  rli: <RliMonitor />,
};

function LoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isConfigured, signIn } = useAuth();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  if (!isConfigured) {
    return (
      <div className="shell">
        <main className="content">
          <p>Admin OIDC is not configured. Set VITE_OIDC_ISSUER and VITE_OIDC_CLIENT_ID, then rebuild the admin image.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <main className="content">
        <h1>EasyCasa ops</h1>
        <p>Sign in with your admin account to continue.</p>
        <button type="button" onClick={() => void signIn()}>
          Sign in
        </button>
      </main>
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
    <p className="muted" style={{ fontSize: '0.75rem', marginTop: '1rem' }}>
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
  const [view, setView] = useState<View>('credentials');

  const activeView = allowedNav.some((n) => n.key === view)
    ? view
    : (allowedNav[0]?.key ?? null);

  return (
    <LoginGate>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            EasyCasa <span>ops</span>
          </div>
          {isAuthenticated ? (
            <button type="button" className="nav-item" onClick={() => void signOut()}>
              <span className="nav-item__label">Sign out</span>
            </button>
          ) : null}
          <nav>
            {allowedNav.map((n) => (
              <button
                key={n.key}
                className={`nav-item${activeView === n.key ? ' nav-item--active' : ''}`}
                onClick={() => setView(n.key)}
              >
                <span className="nav-item__label">{n.label}</span>
                <span className="nav-item__hint">{n.hint}</span>
              </button>
            ))}
          </nav>
          <BuildMarker />
        </aside>
        <main className="content">
          {activeView ? (
            VIEWS[activeView]
          ) : (
            <p>
              No admin role on this account. Ask an operator to assign an{' '}
              <code>admin_*</code> realm role in Keycloak. Bare <code>admin</code> is not enough.
            </p>
          )}
        </main>
      </div>
    </LoginGate>
  );
}
