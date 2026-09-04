import React, { useState } from 'react';

import { CrmContacts } from './CrmContacts';
import { CrmContact360 } from './CrmContact360';
import { CrmDashboard } from './CrmDashboard';
import { CrmPipelines } from './CrmPipelines';
import { CrmSettings } from './CrmSettings';
import { CrmTasks } from './CrmTasks';

type CrmView = 'dashboard' | 'contacts' | 'pipelines' | 'tasks' | 'settings';

const TABS: { key: CrmView; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'pipelines', label: 'Pipelines' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'settings', label: 'Settings' },
];

export function CrmShell() {
  const [tab, setTab] = useState<CrmView>('dashboard');
  const [contactId, setContactId] = useState<string | null>(null);

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
            Seekers, owners, Easy Legenda (Aste), WhatsApp, B4A referrals, and partners.
          </p>
        </div>
        <nav className="crm__tabs" aria-label="CRM sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn btn--sm${tab === t.key ? ' btn--primary' : ''}`}
              onClick={() => setTab(t.key)}
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
      {tab === 'settings' ? <CrmSettings /> : null}
    </section>
  );
}
