import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Table } from '../components/ui';

const RowSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  category: z.string(),
  freeText: z.string().nullable().optional(),
  status: z.string(),
  reporterEmail: z.string().nullable().optional(),
  createdAt: z.string(),
});

export function ListingTakedown() {
  const api = useApi();
  const qc = useQueryClient();
  const [motivation, setMotivation] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['listing-reports'],
    queryFn: async () => z.array(RowSchema).parse(await api.listListingReports()),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; decision: 'removed' | 'kept' | 'more_info'; motivation: string }) =>
      api.decideListingReport(v.id, { decision: v.decision, motivation: v.motivation }),
    onSuccess: () => {
      setSelected(null);
      setMotivation('');
      void qc.invalidateQueries({ queryKey: ['listing-reports'] });
    },
    onError: (e: Error) => setErr(e.message),
  });

  if (list.isLoading) return <p className="muted">Loading reports…</p>;
  if (list.isError) return <p className="error">Failed to load reports (operations role).</p>;

  const rows = (list.data ?? []).filter((r) => r.status === 'open');

  return (
    <section>
      <h1>Listing takedown</h1>
      <p className="muted">
        DSA queue. Motivation is required on every decision; removal notifies the owner with the
        statement of reasons and contest route.
      </p>

      <Table
        columns={['Listing', 'Category', 'Reporter', 'Received', 'Decide']}
        empty={rows.length === 0}
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="mono">{r.listingId.slice(0, 8)}…</td>
            <td>{r.category}</td>
            <td>{r.reporterEmail ?? 'anonymous'}</td>
            <td>{r.createdAt.slice(0, 10)}</td>
            <td>
              <button type="button" className="btn btn--sm" onClick={() => setSelected(r.id)}>
                Decide
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {selected ? (
        <div style={{ marginTop: '1rem', maxWidth: 520 }}>
          <textarea
            rows={4}
            placeholder="Motivation (required, min 10 chars)…"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            style={{ width: '100%' }}
          />
          <div className="actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={motivation.trim().length < 10 || decide.isPending}
              onClick={() =>
                decide.mutate({ id: selected, decision: 'removed', motivation: motivation.trim() })
              }
            >
              Remove
            </button>
            <button
              type="button"
              className="btn btn--sm"
              disabled={motivation.trim().length < 10 || decide.isPending}
              onClick={() =>
                decide.mutate({ id: selected, decision: 'kept', motivation: motivation.trim() })
              }
            >
              Keep
            </button>
            <button
              type="button"
              className="btn btn--sm"
              disabled={motivation.trim().length < 10 || decide.isPending}
              onClick={() =>
                decide.mutate({
                  id: selected,
                  decision: 'more_info',
                  motivation: motivation.trim(),
                })
              }
            >
              Request more info
            </button>
          </div>
          {err ? <p className="error">{err}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
