import React, { useState } from 'react';

import { CrmCallLinks } from './CrmCallLinks';
import { CrmContacts } from './CrmContacts';
import { CrmContact360 } from './CrmContact360';
import { CrmDashboard } from './CrmDashboard';
import { CrmPipelines } from './CrmPipelines';
import { CrmSettings } from './CrmSettings';
import { CrmTasks } from './CrmTasks';

type CrmView = 'dashboard' | 'contacts' | 'pipelines' | 'tasks' | 'calls' | 'settings';

const TABS: { key: CrmView; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'pipelines', label: 'Pipelines' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'calls', label: 'Call links' },
  { key: 'settings', label: 'Settings' },
];

function tabFromHash(): CrmView {
  if (typeof window === 'undefined') return 'dashboard';
  const h = window.location.hash.replace(/^#/, '');
  const key = h === 'crm/call-links' ? 'calls' : h.replace(/^crm\/?/, '') || 'dashboard';
  if (TABS.some((t) => t.key === key)) return key as CrmView;
  return 'dashboard';
}

export function CrmShell() {
  const [tab, setTab] = useState<CrmView>(tabFromHash);
  const [contactId, setContactId] = useState<string | null>(null);

  function goTab(next: CrmView) {
    setTab(next);
    if (typeof window === 'undefined') return;
    window.location.hash = next === 'dashboard' ? 'crm' : `crm/${next === 'calls' ? 'calls' : next}`;
  }

  if (contactId) {
    return (
      <CrmContact360
        contactId={contactId}
        onBack={() => setContactId(null)}
      />
    );
  }

  return (
    <section className="crm">
      <header className="crm__header">
        <div>
          <p className="crm__eyebrow">K EC 4.1 · Internal</p>
          <h1>CRM</h1>
          <p className="muted">
            Seekers, owners, Easy Legenda (Aste), WhatsApp, call requests, B4A referrals, and partners.
          </p>
        </div>
        <nav className="crm__tabs" aria-label="CRM sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn btn--sm${tab === t.key ? ' btn--primary' : ''}`}
              onClick={() => goTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {tab === 'dashboard' ? <CrmDashboard onOpenContact={setContactId} /> : null}
      {tab === 'contacts' ? <CrmContacts onOpenContact={setContactId} /> : null}
      {tab === 'pipelines' ? <CrmPipelines onOpenContact={setContactId} /> : null}
      {tab === 'tasks' ? <CrmTasks onOpenContact={setContactId} /> : null}
      {tab === 'calls' ? <CrmCallLinks /> : null}
      {tab === 'settings' ? <CrmSettings /> : null}
    </section>
  );
}
