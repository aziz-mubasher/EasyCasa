import React, { useState } from 'react';

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

export function App() {
  const [view, setView] = useState<View>('orchestration');

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">EasyCasa <span>ops</span></div>
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
  );
}
