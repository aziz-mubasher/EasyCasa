import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Table } from '../components/ui';

const RowSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  state: z.string(),
  sellerUserId: z.string().optional(),
  sellerDisplayName: z.string().nullable().optional(),
  priorityModeration: z.boolean().optional(),
  nameMatchVerdict: z.string().nullable(),
  nameMatchScore: z.number().nullable(),
  docKeys: z.array(z.string()),
  updatedAt: z.string(),
  help: z.string().nullable().optional(),
  sellerPhone: z.string().nullable().optional(),
});

export function VoModeration() {
  const api = useApi();
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['vo-queue'],
    queryFn: async () => z.array(RowSchema).parse(await api.listVoQueue()),
  });

  const detail = useQuery({
    queryKey: ['vo-case', selected],
    enabled: Boolean(selected),
    queryFn: async () => RowSchema.parse(await api.getVoCase(selected!)),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['vo-queue'] });
    if (selected) void qc.invalidateQueries({ queryKey: ['vo-case', selected] });
  };

  const claim = useMutation({
    mutationFn: (id: string) => api.claimVoCase(id),
    onSuccess: invalidate,
    onError: (e: Error) => setErr(e.message),
  });
  const verify = useMutation({
    mutationFn: (id: string) => api.verifyVoCase(id),
    onSuccess: () => {
      setSelected(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });
  const reject = useMutation({
    mutationFn: (v: { id: string; reason: string }) => api.rejectVoCase(v.id, v.reason),
    onSuccess: () => {
      setRejectReason('');
      setSelected(null);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (list.isLoading) return <p className="muted">Loading Verified Owner queue…</p>;
  if (list.isError) return <p className="error">Failed to load (vo_moderation capability).</p>;

  const rows = list.data ?? [];
  const d = detail.data;

  return (
    <section>
      <h1>Verified Owner</h1>
      <p className="muted">
        Listing anti-fraud moderation (T04 row 7). Name-match is advisory — never auto-verifies.
        Company / partial verdicts require manual review (T05 §6.3). Premium sellers may appear
        earlier in this queue (priority flag) — that changes order only, not verification
        standards or acceptance criteria.
      </p>

      <Table
        columns={['Seller', 'Listing', 'State', 'Priority', 'Name match', 'Queued', 'Actions']}
        empty={rows.length === 0}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.sellerDisplayName ?? r.sellerUserId?.slice(0, 8) ?? '—'}</td>
            <td className="mono">{r.listingId.slice(0, 8)}…</td>
            <td>{r.state}</td>
            <td>{r.priorityModeration ? 'premium' : '—'}</td>
            <td>
              <span className="mono">
                {r.nameMatchVerdict ?? '—'}
                {r.nameMatchScore != null ? ` (${r.nameMatchScore.toFixed(2)})` : ''}
              </span>
            </td>
            <td>{r.updatedAt.slice(0, 10)}</td>
            <td>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setErr(null);
                    setSelected(r.id);
                  }}
                >
                  Open
                </button>
                {r.state === 'submitted' ? (
                  <button
                    type="button"
                    className="btn btn--sm"
                    disabled={claim.isPending}
                    onClick={() => claim.mutate(r.id)}
                  >
                    Claim
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {selected && d ? (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #ddd' }}>
          <h2>Case detail</h2>
          <p>
            Seller: <strong>{d.sellerDisplayName ?? '—'}</strong>
            {d.sellerPhone ? ` · ${d.sellerPhone}` : ''}
          </p>
          <p>
            Advisory chip:{' '}
            <span className="mono">
              {d.nameMatchVerdict ?? '—'}
              {d.nameMatchScore != null ? ` · score ${d.nameMatchScore.toFixed(2)}` : ''}
            </span>
          </p>
          {d.help ? <p className="muted">{d.help}</p> : null}
          <p className="muted">
            Docs ({d.docKeys.length}) — open via authorized private media URL after audit:
          </p>
          <ul>
            {d.docKeys.map((k) => {
              const base =
                import.meta.env.VITE_API_BASE_URL ?? 'https://easycasaita.com/api';
              return (
                <li key={k} className="mono">
                  <a href={`${base}/media/file/${k}`} target="_blank" rel="noreferrer">
                    {k}
                  </a>
                </li>
              );
            })}
          </ul>

          {d.state === 'in_review' ? (
            <div className="actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn--sm btn--primary"
                disabled={verify.isPending}
                onClick={() => verify.mutate(d.id)}
              >
                Verify
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                disabled={reject.isPending || rejectReason.trim().length < 3}
                onClick={() => reject.mutate({ id: d.id, reason: rejectReason.trim() })}
              >
                Reject
              </button>
            </div>
          ) : null}

          <label className="muted" style={{ display: 'block', marginTop: 12 }}>
            Reject reason (required for reject)
            <input
              style={{ display: 'block', width: '100%', maxWidth: 420, marginTop: 4 }}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </label>
        </div>
      ) : null}

      {err ? <p className="error">{err}</p> : null}
    </section>
  );
}
