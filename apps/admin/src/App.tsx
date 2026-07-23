import React, { useState } from 'react';

import { useAuth } from './auth/AuthProvider';
import { Orchestration } from './pages/Orchestration';
import { Credentials } from './pages/Credentials';
import { ComplianceConfig } from './pages/ComplianceConfig';
import { AmlCases } from './pages/AmlCases';
import { RliMonitor } from './pages/RliMonitor';

type View = 'orchestration' | 'credentials' | 'compliance' | 'aml' | 'rli';

const NAV: { key: View; label: string; hint: string }[] = [
  { key: 'orchestration', label: 'Orchestration', hint: 'Assign tasks' },
  { key: 'credentials', label: 'Credentials', hint: 'Verify professionals' },
  { key: 'compliance', label: 'Compliance', hint: 'Legal basis & credentials' },
  { key: 'aml', label: 'AML / KYC', hint: 'Risk cases' },
  { key: 'rli', label: 'RLI monitor', hint: 'Registration deadlines' },
];

const VIEWS: Record<View, React.ReactNode> = {
  orchestration: <Orchestration />,
  credentials: <Credentials />,
  compliance: <ComplianceConfig />,
  aml: <AmlCases />,
  rli: <RliMonitor />,
};

function LoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isConfigured, usesDevAuth, signIn } = useAuth();

  if (usesDevAuth || isAuthenticated) {
    return <>{children}</>;
  }

  if (!isConfigured) {
    return (
      <div className="shell">
        <main className="content">
          <p>Admin OIDC is not configured. Set VITE_OIDC_ISSUER and rebuild, or enable VITE_DEV_AUTH.</p>
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

export function App() {
  const [view, setView] = useState<View>('orchestration');
  const { usesDevAuth, isAuthenticated, signOut } = useAuth();

  return (
    <LoginGate>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            EasyCasa <span>ops</span>
          </div>
          {!usesDevAuth && isAuthenticated ? (
            <button type="button" className="nav-item" onClick={() => void signOut()}>
              <span className="nav-item__label">Sign out</span>
            </button>
          ) : null}
          <nav>
            {NAV.map((n) => (
              <button
                key={n.key}
                className={`nav-item${view === n.key ? ' nav-item--active' : ''}`}
                onClick={() => setView(n.key)}
              >
                <span className="nav-item__label">{n.label}</span>
                <span className="nav-item__hint">{n.hint}</span>
              </button>
            ))}
          </nav>
        </aside>
        <main className="content">{VIEWS[view]}</main>
      </div>
    </LoginGate>
  );
}
