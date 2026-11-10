import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';
import { adminRolesFromAccessToken } from '../auth/roles';
import { useApi } from '../api';

type LeadRow = {
  id: string;
  status: string;
  ownerUserId: string | null;
  product: string;
  route: string;
  locale: string;
  createdAt: string;
  windowRemainingMs: number | null;
  needsFollowUp?: boolean;
  callStatus: string | null;
};

type LeadDetail = LeadRow & {
  intakeStatus: string;
  contactPref: string | null;
  answers: Record<string, string>;
  summary: unknown;
  windowOpen: boolean;
  conversationHref: string;
  calls: Array<{
    id: string;
    status: string;
    customerPreference: string | null;
    requestedSlot: string | null;
    offeredSlot: string | null;
    durationMin: number;
    callLanguage: string;
    reminderSentAt: string | null;
  }>;
};

function leadIdFromHash(): string | null {
  const raw = window.location.hash.replace(/^#/, '');
  const match = raw.match(/^whatsapp\/leads\/([^/]+)$/);
  return match?.[1] ?? null;
}

function windowLabel(ms: number | null): string {
  if (ms == null) return '—';
  if (ms <= 0) return 'closed';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

const DAYS = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [7, 'Sun'],
] as const;

function clockToMin(value: string): number {
  const [hour = 0, minute = 0] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

export function WhatsAppLeads() {
  const api = useApi();
  const { accessToken } = useAuth();
  const superadmin = adminRolesFromAccessToken(accessToken).includes('superadmin');
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('completed');
  const [ownerId, setOwnerId] = useState('');
  const [slot, setSlot] = useState('');
  const [callLanguage, setCallLanguage] = useState('it');
  const [draft, setDraft] = useState('');
  const [translated, setTranslated] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [owner, setOwner] = useState('');
  const [product, setProduct] = useState('');
  const [selected, setSelected] = useState<string | null>(() => leadIdFromHash());

  const list = useQuery({
    queryKey: ['whatsapp', 'leads', status, owner, product],
    queryFn: () =>
      api.listWhatsAppLeads({
        status: status || undefined,
        ownerUserId: owner || undefined,
        product: product || undefined,
      }),
  });

  const detail = useQuery({
    queryKey: ['whatsapp', 'leads', selected],
    enabled: Boolean(selected),
    queryFn: () => api.getWhatsAppLead(selected!) as Promise<LeadDetail>,
  });

  const alertStatus = useQuery({
    queryKey: ['whatsapp', 'alert-status'],
    queryFn: () => api.whatsAppAlertStatus(),
  });
  const roster = useQuery({
    queryKey: ['whatsapp', 'roster'],
    enabled: superadmin,
    queryFn: () => api.listWhatsAppRoster(),
  });
  const [rosterUser, setRosterUser] = useState('');
  const [rosterRole, setRosterRole] = useState('primary');
  const [rosterDays, setRosterDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [rosterStart, setRosterStart] = useState('09:00');
  const [rosterEnd, setRosterEnd] = useState('18:00');
  const [rosterEmail, setRosterEmail] = useState('');
  const [rosterActive, setRosterActive] = useState(true);
  const saveRoster = useMutation({
    mutationFn: () =>
      api.saveWhatsAppRoster(rosterUser.trim(), {
        role: rosterRole,
        days: rosterDays,
        startMin: clockToMin(rosterStart),
        endMin: clockToMin(rosterEnd),
        email: rosterEmail.trim(),
        active: rosterActive,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['whatsapp', 'roster'] }),
  });

  const rows = (list.data?.items ?? []) as LeadRow[];
  const measures = alertStatus.data?.measures;
  const lead = detail.data;

  const assign = useMutation({
    mutationFn: (ownerUserId?: string) => api.assignWhatsAppLead(selected!, ownerUserId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['whatsapp', 'leads'] }),
  });
  const close = useMutation({
    mutationFn: () => api.closeWhatsAppLead(selected!, reason),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['whatsapp', 'leads'] }),
  });
  const call = useMutation({
    mutationFn: (action: 'confirm' | 'offer' | 'cancel' | 'done' | 'no_show') =>
      api.decideWhatsAppCall(selected!, {
        action,
        requestedSlot: action === 'confirm' ? new Date(slot).toISOString() : undefined,
        offeredSlot: action === 'offer' ? new Date(slot).toISOString() : undefined,
        callLanguage,
      }),
    onSuccess: () => {
      setActionError(null);
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'leads'] });
    },
    onError: (err: unknown) => setActionError(err instanceof Error ? err.message : 'Call action failed'),
  });
  const translate = useMutation({
    mutationFn: () => api.translateWhatsAppAssist({ text: draft, locale: detail.data?.locale ?? 'en' }),
    onSuccess: (result) => setTranslated(result.translation),
    onError: (err: unknown) => setActionError(err instanceof Error ? err.message : 'Translate failed'),
  });

  const answerLines = useMemo(() => {
    if (!lead?.answers) return [];
    return Object.entries(lead.answers);
  }, [lead]);

  if (selected) {
    return (
      <section className="ecwa-hub">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            setSelected(null);
            window.location.hash = 'whatsapp/leads';
          }}
        >
          Back to leads
        </button>
        {!lead ? <p className="muted">Loading lead…</p> : null}
        {lead ? (
          <div className="ecwa-hub__grid">
            <section>
              <h2>Conversation</h2>
              <p className="muted">
                Window {lead.windowOpen ? `open · ${windowLabel(lead.windowRemainingMs)} left` : 'closed'}.
                Free text is rejected once it closes. Only an approved template can go out.
              </p>
              <p>No price opinion, no lot analysis, nothing about credit or Banks4All.</p>
              <a href={lead.conversationHref}>Open the thread</a>
              <label>
                Draft in Italian or English
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
              </label>
              <button type="button" className="btn btn--sm" disabled={!draft.trim()} onClick={() => translate.mutate()}>
                Translate
              </button>
              {translated ? <p>{translated}</p> : null}
              <p className="muted">Edit the translation, then send it yourself from the thread.</p>
              <div>
                <button type="button" className="btn btn--sm" onClick={() => assign.mutate(undefined)}>
                  Assign to me
                </button>
                <input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="Assign to user id" />
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={!ownerId}
                  onClick={() => assign.mutate(ownerId)}
                >
                  Assign to…
                </button>
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="no_reply">no reply</option>
                  <option value="not_our_service">not our service</option>
                  <option value="handed_to_professional">handed to a professional</option>
                  <option value="completed">completed</option>
                </select>
                <button type="button" className="btn btn--sm" onClick={() => close.mutate()}>
                  Close
                </button>
              </div>
            </section>
            <section>
              <h2>Intake</h2>
              <p className="muted">
                {lead.product} · {lead.route} · {lead.locale} · {lead.intakeStatus}
              </p>
              <ul>
                {answerLines.map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}</strong> {value}
                  </li>
                ))}
              </ul>
              {lead.summary ? <pre>{JSON.stringify(lead.summary, null, 2)}</pre> : <p className="muted">No summary yet.</p>}
            </section>
            <section>
              <h2>Call request</h2>
              {actionError ? <p className="error">{actionError}</p> : null}
              {lead.calls.length === 0 ? <p className="muted">No call requested.</p> : null}
              {lead.calls.length > 0 ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                  }}
                >
                  <label>
                    Slot
                    <input type="datetime-local" value={slot} onChange={(e) => setSlot(e.target.value)} />
                  </label>
                  <label>
                    Language
                    <select value={callLanguage} onChange={(e) => setCallLanguage(e.target.value)}>
                      <option value="it">Italian</option>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                    </select>
                  </label>
                  <button type="button" className="btn btn--sm" onClick={() => call.mutate('confirm')}>Confirm</button>
                  <button type="button" className="btn btn--sm" onClick={() => call.mutate('offer')}>Offer another</button>
                  <button type="button" className="btn btn--sm" onClick={() => call.mutate('cancel')}>Cancel</button>
                  <button type="button" className="btn btn--sm" onClick={() => call.mutate('done')}>Done</button>
                  <button type="button" className="btn btn--sm" onClick={() => call.mutate('no_show')}>No-show</button>
                </form>
              ) : null}
              {lead.calls.map((call) => (
                <dl key={call.id}>
                  <div>
                    <dt>Status</dt>
                    <dd>{call.status}</dd>
                  </div>
                  <div>
                    <dt>Preference</dt>
                    <dd>{call.customerPreference ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>{call.requestedSlot ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Offered</dt>
                    <dd>{call.offeredSlot ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Length</dt>
                    <dd>{call.durationMin} min · {call.callLanguage}</dd>
                  </div>
                </dl>
              ))}
            </section>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="ecwa-hub">
      <h2>Leads</h2>
      {alertStatus.data?.nobodyReceives ? (
        <p className="banner banner--danger">Nobody receives lead alerts.</p>
      ) : null}
      {measures ? (
        <p className="muted">
          30 days · assign {measures.meanAssignMin ?? '—'} min · first reply {measures.meanFirstReplyMin ?? '—'} min · inside window{' '}
          {measures.answeredInsideWindowPct ?? '—'}% · alerts/lead {measures.alertsPerLead ?? '—'}
          {measures.alertsPerLead != null && measures.alertsPerLead > 2 ? ' · roster hours look wrong' : ''}
        </p>
      ) : null}
      <form
        className="ecwa-hub__filters"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label>
          Status
          <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="new" />
        </label>
        <label>
          Owner
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="user id" />
        </label>
        <label>
          Product
          <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="easycasa" />
        </label>
      </form>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Owner</th>
            <th>Product</th>
            <th>Route</th>
            <th>Locale</th>
            <th>Created</th>
            <th>Window</th>
            <th>Call</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setSelected(row.id);
                    window.location.hash = `whatsapp/leads/${row.id}`;
                  }}
                >
                  {row.needsFollowUp ? 'Needs follow-up template' : row.status}
                </button>
              </td>
              <td className="mono">{row.ownerUserId ?? '—'}</td>
              <td>{row.product}</td>
              <td>{row.route}</td>
              <td>{row.locale}</td>
              <td>{row.createdAt.slice(0, 16)}</td>
              <td>{windowLabel(row.windowRemainingMs)}</td>
              <td>{row.callStatus ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="muted">No leads.</p> : null}
      {superadmin ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (rosterUser.trim() && rosterEmail.trim() && rosterDays.length > 0) saveRoster.mutate();
          }}
        >
          <h3>Alert roster</h3>
          <p className="muted">Email only. A phone number is not collected. Saturday is a normal day on this form.</p>
          <input value={rosterUser} onChange={(event) => setRosterUser(event.target.value)} placeholder="Admin user id" />
          <select value={rosterRole} onChange={(event) => setRosterRole(event.target.value)}>
            <option value="primary">primary</option>
            <option value="backup">backup</option>
            <option value="owner">owner</option>
          </select>
          {DAYS.map(([day, label]) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={rosterDays.includes(day)}
                onChange={(event) =>
                  setRosterDays((current) =>
                    event.target.checked ? [...current, day].sort() : current.filter((item) => item !== day),
                  )
                }
              />
              {label}
            </label>
          ))}
          <input type="time" value={rosterStart} onChange={(event) => setRosterStart(event.target.value)} />
          <input type="time" value={rosterEnd} onChange={(event) => setRosterEnd(event.target.value)} />
          <input value={rosterEmail} onChange={(event) => setRosterEmail(event.target.value)} placeholder="Email" />
          <label>
            <input type="checkbox" checked={rosterActive} onChange={(event) => setRosterActive(event.target.checked)} />
            Active
          </label>
          <button type="submit" className="btn btn--sm" disabled={saveRoster.isPending}>
            Save roster row
          </button>
          {roster.data?.items.map((row) => (
            <p key={row.userId}>
              {row.role} · {row.email} · days {row.days.join(',')} · {row.active ? 'on' : 'off'}
            </p>
          ))}
        </form>
      ) : null}
    </section>
  );
}
