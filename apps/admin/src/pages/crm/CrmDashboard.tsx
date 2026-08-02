import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '../../api';
import { Badge } from '../../components/ui';

function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Math.round(n * 100)}%`;
}

function mins(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `${Math.round(n)} min`;
}

export function CrmDashboard({ onOpenContact }: { onOpenContact: (id: string) => void }) {
  const api = useApi();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'dashboard'],
    queryFn: () => api.crmDashboard(),
  });

  if (isLoading) return <p className="muted">Loading CRM dashboard…</p>;
  if (isError || !data) {
    return (
      <p className="error">
        CRM unavailable. Ensure <code className="mono">CRM_ENABLED=true</code> and a{' '}
        <code className="mono">crm-*</code> realm role.
      </p>
    );
  }

  const m = data.metrics;

  return (
    <div className="crm-dash">
      {!data.crmEnabled ? (
        <p className="crm-banner">
          Feature flag off — API returns 503 until <code className="mono">CRM_ENABLED=true</code>{' '}
          (counsel gate §1.6 Q2a).
        </p>
      ) : null}
      <div className="crm-kpis">
        <article className="crm-kpi">
          <p className="crm-kpi__label">Enquiry → viewing</p>
          <p className="crm-kpi__value mono">{pct(m.enquiryToViewingRate)}</p>
        </article>
        <article className="crm-kpi">
          <p className="crm-kpi__label">Median first response</p>
          <p className="crm-kpi__value mono">{mins(m.medianFirstResponseMinutes)}</p>
        </article>
        <article className="crm-kpi">
          <p className="crm-kpi__label">Viewings with outcome</p>
          <p className="crm-kpi__value mono">{pct(m.viewingOutcomeRecordedRate)}</p>
        </article>
        <article className="crm-kpi">
          <p className="crm-kpi__label">B4A referral → attestation</p>
          <p className="crm-kpi__value mono estimate">{pct(m.b4aReferralAttestationRate)}</p>
        </article>
      </div>

      <div className="crm-split">
        <section>
          <h2>Seeker funnel</h2>
          <ul className="crm-funnel">
            {data.seekerFunnel.map((s) => (
              <li key={s.stage}>
                <span>{s.stage.replace(/_/g, ' ')}</span>
                <span className="mono">{s.count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>My tasks due today</h2>
          {data.myTasksDueToday.length === 0 ? (
            <p className="muted">Nothing due today.</p>
          ) : (
            <ul className="crm-tasklist">
              {data.myTasksDueToday.map((t) => (
                <li key={t.id}>
                  <button type="button" className="linkish" onClick={() => onOpenContact(t.contactId)}>
                    {t.title}
                  </button>
                  <Badge variant="amber">{t.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
