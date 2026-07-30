import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Table } from '../components/ui';

const RowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accountName: z.string(),
  documentUrl: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export function IdentityReview() {
  const api = useApi();
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [viewed, setViewed] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['identity-reviews'],
    queryFn: async () => z.array(RowSchema).parse(await api.listIdentityReviews()),
  });

  const verify = useMutation({
    mutationFn: (id: string) => api.verifyIdentityReview(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['identity-reviews'] }),
    onError: (e: Error) => setErr(e.message),
  });
  const reject = useMutation({
    mutationFn: (v: { id: string; reason: string }) => api.rejectIdentityReview(v.id, v.reason),
    onSuccess: () => {
      setRejectReason('');
      void qc.invalidateQueries({ queryKey: ['identity-reviews'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (list.isLoading) return <p className="muted">Loading identity queue…</p>;
  if (list.isError) return <p className="error">Failed to load (operations role).</p>;

  const rows = list.data ?? [];

  return (
    <section>
      <h1>Identity review</h1>
      <p className="muted">
        Viewing a document writes an audit row. Decision deletes the document URL in the same
        transaction.
      </p>

      <Table columns={['Account', 'User', 'Queued', 'Actions']} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.accountName}</td>
            <td className="mono">{r.userId.slice(0, 8)}…</td>
            <td>{r.createdAt.slice(0, 10)}</td>
            <td>
              <div className="actions">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    void (async () => {
                      try {
                        await api.viewIdentityReview(r.id);
                        setViewed(r.documentUrl);
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : 'view failed');
                      }
                    })()
                  }
                >
                  View (audited)
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  disabled={verify.isPending}
                  onClick={() => verify.mutate(r.id)}
                >
                  Verify
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--danger"
                  disabled={reject.isPending || rejectReason.trim().length < 3}
                  onClick={() => reject.mutate({ id: r.id, reason: rejectReason.trim() })}
                >
                  Reject
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <label className="muted" style={{ display: 'block', marginTop: 12 }}>
        Reject reason
        <input
          style={{ display: 'block', width: '100%', maxWidth: 420, marginTop: 4 }}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </label>

      {viewed ? (
        <p style={{ marginTop: 12 }}>
          Document:{' '}
          <a href={viewed} target="_blank" rel="noreferrer">
            open
          </a>
        </p>
      ) : null}
      {err ? <p className="error">{err}</p> : null}
    </section>
  );
}
