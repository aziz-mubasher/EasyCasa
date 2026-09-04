import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmSourceLabel } from '@easycasa/shared';

import { useApi } from '../../api';
import { Badge } from '../../components/ui';

function formatBand(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `€${(cents / 100).toLocaleString('it-IT', { maximumFractionDigits: 0 })}`;
}

export function CrmContact360({
  contactId,
  onBack,
}: {
  contactId: string;
  onBack: () => void;
}) {
  const api = useApi();
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'call' | 'email'>('note');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'contact', contactId],
    queryFn: () => api.crmGetContact(contactId),
  });

  const log = useMutation({
    mutationFn: () =>
      api.crmAddActivity(contactId, { type: noteType, body: note }),
    onSuccess: () => {
      setNote('');
      void qc.invalidateQueries({ queryKey: ['crm', 'contact', contactId] });
    },
  });

  if (isLoading) return <p className="muted">Loading Contact-360…</p>;
  if (isError || !data) return <p className="error">Failed to load contact.</p>;

  const { contact, seeker, owner, b4a, partner, recentActivities, openTasks } = data;
  const roles: string[] = [];
  if (seeker) roles.push('seeker');
  if (owner) roles.push('owner');
  if (b4a) roles.push('b4a');
  if (partner) roles.push('partner');

  return (
    <section className="crm-360">
      <button type="button" className="btn btn--sm" onClick={onBack}>
        ← Contacts
      </button>
      <header className="crm-360__head">
        <div>
          <h1>{contact.fullName}</h1>
          <p className="muted mono">
            {contact.email ?? '—'} · {contact.phone ?? '—'}
          </p>
          <div className="crm-badges">
            <Badge variant={contact.source === 'aste' ? 'amber' : 'grey'}>
              {crmSourceLabel(contact.source)}
            </Badge>
            {contact.locale ? <Badge variant="grey">{contact.locale}</Badge> : null}
            {roles.map((r) => (
              <Badge key={r} variant="blue">
                {r}
              </Badge>
            ))}
            {(contact.tags ?? []).map((t) => (
              <span key={t} className="crm-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="crm-360__grid">
        <div className="crm-360__panels">
          {seeker ? (
            <article className="crm-panel">
              <h2>Seeker</h2>
              <p>
                Stage: <Badge variant="amber">{seeker.stage}</Badge>
              </p>
              <p className="muted mono">First enquiry: {seeker.firstEnquiryId ?? '—'}</p>
              {seeker.searchIntent && Object.keys(seeker.searchIntent).length > 0 ? (
                <p className="muted">
                  Intent:{' '}
                  <span className="mono">
                    {[
                      seeker.searchIntent.brand,
                      seeker.searchIntent.channel,
                      seeker.searchIntent.kind,
                      seeker.searchIntent.whatsappLanguage,
                    ]
                      .filter((v): v is string => typeof v === 'string' && v.length > 0)
                      .join(' · ') || '—'}
                  </span>
                </p>
              ) : null}
            </article>
          ) : null}
          {owner ? (
            <article className="crm-panel">
              <h2>Owner</h2>
              <p>
                Stage: <Badge variant="amber">{owner.stage}</Badge>
              </p>
              <p className="muted">Channel: {owner.preferredChannel}</p>
              <p className="muted mono">Listings: {(owner.listingIds ?? []).length}</p>
            </article>
          ) : null}
          {b4a ? (
            <article className="crm-panel">
              <h2>B4A referral</h2>
              {b4a.attestationStatus === 'none' ? (
                <p className="muted">Nessuna attestazione</p>
              ) : (
                <>
                  <p>
                    Status:{' '}
                    <Badge variant={b4a.attestationStatus === 'active' ? 'green' : 'grey'}>
                      {b4a.attestationStatus}
                    </Badge>
                  </p>
                  <p>
                    Band:{' '}
                    <span className="mono estimate">{formatBand(b4a.bandMaxCents)}</span>
                  </p>
                  <p className="muted mono">Expires: {b4a.attestationExpiresAt ?? '—'}</p>
                  <p className="muted mono">Initials: {b4a.holderInitials ?? '—'}</p>
                </>
              )}
            </article>
          ) : null}
          {partner ? (
            <article className="crm-panel">
              <h2>Partner</h2>
              <p>
                {partner.partnerType} · <Badge variant="amber">{partner.stage}</Badge>
              </p>
              <p className="muted">{(partner.serviceZones ?? []).join(', ') || '—'}</p>
            </article>
          ) : null}
        </div>

        <div className="crm-360__timeline">
          <h2>Activity</h2>
          <div className="crm-composer">
            <select
              className="input"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as 'note' | 'call' | 'email')}
            >
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
            </select>
            <textarea
              className="input"
              rows={3}
              placeholder="Log a note, call, or email…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!note.trim() || log.isPending}
              onClick={() => log.mutate()}
            >
              Log
            </button>
          </div>
          <ul className="crm-timeline">
            {recentActivities.map((a) => (
              <li key={a.id}>
                <span className="crm-timeline__type">{a.type}</span>
                <span>{a.body}</span>
                <time className="muted mono">{new Date(a.createdAt).toLocaleString('it-IT')}</time>
              </li>
            ))}
          </ul>
          <h2>Open tasks</h2>
          {openTasks.length === 0 ? (
            <p className="muted">No open tasks.</p>
          ) : (
            <ul className="crm-tasklist">
              {openTasks.map((t) => (
                <li key={t.id}>
                  {t.title}
                  <span className="muted mono">
                    {t.dueAt ? new Date(t.dueAt).toLocaleDateString('it-IT') : 'no due'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
