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

function statusOf(err: unknown): number | null {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status: unknown }).status;
    return typeof s === 'number' ? s : null;
  }
  return null;
}

function crmErrorHint(err: unknown): string {
  const status = statusOf(err);
  if (status === 503) {
    return 'CRM is disabled on the API (CRM_ENABLED=false). Set it true and recreate the api container.';
  }
  if (status === 403) {
    return 'Your token has no crm-* realm role. In Keycloak assign crm-admin (or crm-ops), then sign out and sign in again.';
  }
  if (status === 401) {
    return 'Not signed in — sign in again on the admin portal.';
  }
  if (status != null) return `CRM API error ${status}.`;
  return 'CRM unavailable. Ensure CRM_ENABLED=true and a crm-* realm role on your Keycloak user (then re-login).';
}

export function CrmDashboard({ onOpenContact }: { onOpenContact: (id: string) => void }) {
  const api = useApi();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['crm', 'dashboard'],
    queryFn: () => api.crmDashboard(),
  });

  if (isLoading) return <p className="muted">Loading CRM dashboard…</p>;
  if (isError || !data) {
    return <p className="error">{crmErrorHint(error)}</p>;
  }

  const m = data.metrics;

  return (
    <div className="crm-dash">
      {!data.crmEnabled ? (
        <p className="crm-banner">
          Feature flag off — set <code className="mono">CRM_ENABLED=true</code> in the
          environment (§1.6 Q2a consent applied; production may enable).
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
