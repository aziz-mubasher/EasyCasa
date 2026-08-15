import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Table } from '../components/ui';

const FlaggedSchema = z.object({
  id: z.string(),
  listingId: z.string().nullable().optional(),
  storageKey: z.string().nullable().optional(),
  moderationFlag: z.string().nullable().optional(),
  ownerUserId: z.string().nullable().optional(),
  createdAt: z.string(),
});

const OffenderSchema = z.object({
  userId: z.string(),
  eventCount: z.number(),
});

/**
 * EC-S-T19 / T19.2 — flagged media, repeat offenders, suspend / unsuspend.
 */
export function AbuseControls() {
  const api = useApi();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const flagged = useQuery({
    queryKey: ['abuse-flagged'],
    queryFn: async () => z.array(FlaggedSchema).parse(await api.listAbuseFlaggedMedia()),
  });

  const offenders = useQuery({
    queryKey: ['abuse-offenders'],
    queryFn: async () => z.array(OffenderSchema).parse(await api.listAbuseRepeatOffenders(30, 3)),
  });

  const suspend = useMutation({
    mutationFn: (v: { userId: string; reason: string }) => api.suspendAbuseUser(v.userId, v.reason),
    onSuccess: () => {
      setSelected(null);
      setReason('');
      setErr(null);
      void qc.invalidateQueries({ queryKey: ['abuse-offenders'] });
      void qc.invalidateQueries({ queryKey: ['abuse-flagged'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  const unsuspend = useMutation({
    mutationFn: (userId: string) => api.unsuspendAbuseUser(userId),
    onSuccess: () => {
      setErr(null);
      void qc.invalidateQueries({ queryKey: ['abuse-offenders'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (flagged.isLoading || offenders.isLoading) return <p className="muted">Loading abuse queues…</p>;
  if (flagged.isError || offenders.isError) {
    return <p className="error">Failed to load abuse queues (vo_moderation capability).</p>;
  }

  const flaggedRows = flagged.data ?? [];
  const offenderRows = offenders.data ?? [];

  return (
    <section>
      <h1>Abuse controls</h1>
      <p className="muted">
        T19 flagged media + repeat offenders. T19.2: suspend unpublishes all owned listings and blocks
        upload/publish until unsuspend. Reason min 10 chars.
      </p>
      {err ? <p className="error">{err}</p> : null}

      <h2>Repeat offenders (30d, min 3)</h2>
      <Table columns={['User', 'Events', 'Actions']} empty={offenderRows.length === 0}>
        {offenderRows.map((r) => (
          <tr key={r.userId}>
            <td className="mono">{r.userId.slice(0, 8)}…</td>
            <td>{r.eventCount}</td>
            <td>
              <button type="button" className="btn btn--sm btn--danger" onClick={() => setSelected(r.userId)}>
                Suspend
              </button>{' '}
              <button
                type="button"
                className="btn btn--sm"
                disabled={unsuspend.isPending}
                onClick={() => unsuspend.mutate(r.userId)}
              >
                Unsuspend
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {selected ? (
        <div style={{ marginTop: '1rem', maxWidth: 520 }}>
          <p className="muted">
            Suspend <span className="mono">{selected}</span>
          </p>
          <textarea
            rows={3}
            placeholder="Reason (required, min 10 chars)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: '100%' }}
          />
          <div className="actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={reason.trim().length < 10 || suspend.isPending}
              onClick={() => suspend.mutate({ userId: selected, reason: reason.trim() })}
            >
              Confirm suspend
            </button>
            <button type="button" className="btn btn--sm" onClick={() => setSelected(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <h2 style={{ marginTop: '2rem' }}>Flagged media</h2>
      <Table
        columns={['Media', 'Flag', 'Owner', 'Listing', 'When']}
        empty={flaggedRows.length === 0}
      >
        {flaggedRows.map((r) => (
          <tr key={r.id}>
            <td className="mono">{r.id.slice(0, 8)}…</td>
            <td>{r.moderationFlag ?? '—'}</td>
            <td className="mono">{r.ownerUserId ? `${r.ownerUserId.slice(0, 8)}…` : '—'}</td>
            <td className="mono">{r.listingId ? `${r.listingId.slice(0, 8)}…` : '—'}</td>
            <td>{r.createdAt.slice(0, 10)}</td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
