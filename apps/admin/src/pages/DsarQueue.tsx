import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Badge, Table } from '../components/ui';

const RowSchema = z.object({
  id: z.string(),
  subjectEmail: z.string(),
  requestType: z.string(),
  status: z.string(),
  receivedAt: z.string(),
  deadlineAt: z.string(),
  daysToDeadline: z.number(),
  urgent: z.boolean(),
});

export function DsarQueue() {
  const api = useApi();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'access' | 'erasure' | 'rectification' | 'objection'>('access');
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['dsar'],
    queryFn: async () => z.array(RowSchema).parse(await api.listDsar()),
  });
  const holds = useQuery({
    queryKey: ['dsar-holds'],
    queryFn: () => api.dsarLegalHolds(),
  });

  const createReq = useMutation({
    mutationFn: () => api.createDsar({ subjectEmail: email, requestType: type }),
    onSuccess: () => {
      setEmail('');
      void qc.invalidateQueries({ queryKey: ['dsar'] });
    },
  });

  if (list.isLoading) return <p className="muted">Loading DSAR queue…</p>;
  if (list.isError) return <p className="error">Failed to load DSAR (needs dpo / superadmin).</p>;

  const rows = list.data ?? [];

  async function run(fn: () => Promise<unknown>) {
    setErr(null);
    try {
      await fn();
      setSelected(null);
      void qc.invalidateQueries({ queryKey: ['dsar'] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    }
  }

  return (
    <section>
      <h1>DSAR queue</h1>
      <p className="muted">DPO only. Statutory deadline = received + 1 month. Flag ≤7 days.</p>

      <div className="actions" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input placeholder="subject@email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="access">access</option>
          <option value="erasure">erasure</option>
          <option value="rectification">rectification</option>
          <option value="objection">objection</option>
        </select>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={!email.includes('@') || createReq.isPending}
          onClick={() => createReq.mutate()}
        >
          Add request
        </button>
      </div>

      <Table columns={['Subject', 'Type', 'Deadline', 'Status', 'Open']} empty={rows.length === 0}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.subjectEmail}</td>
            <td>{r.requestType}</td>
            <td>
              {r.deadlineAt.slice(0, 10)}
              {r.urgent ? <Badge variant="red">≤7d</Badge> : null}
            </td>
            <td>{r.status}</td>
            <td>
              <button type="button" className="btn btn--sm" onClick={() => setSelected(r.id)}>
                Open
              </button>
            </td>
          </tr>
        ))}
      </Table>

      {selected ? (
        <div style={{ marginTop: '1.5rem', maxWidth: 560 }}>
          <h2>Request {selected.slice(0, 8)}…</h2>
          <p className="muted">Legal holds (same as *I miei dati*):</p>
          <ul>
            {(holds.data?.it ?? []).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
          <div className="actions">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() =>
                void (async () => {
                  try {
                    const data = await api.exportDsar(selected);
                    setExportJson(JSON.stringify(data, null, 2));
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : 'export failed');
                  }
                })()
              }
            >
              Generate export
            </button>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => {
                if (!window.confirm('Execute erasure? Legal holds retain some data.')) return;
                void run(() => api.eraseDsar(selected));
              }}
            >
              Execute erasure
            </button>
          </div>
          <textarea
            rows={3}
            placeholder="Response sent to subject…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', marginTop: 8 }}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={note.trim().length < 3}
            onClick={() => void run(() => api.respondDsar(selected, note.trim()))}
          >
            Record response sent
          </button>
          {exportJson ? (
            <pre className="mono" style={{ maxHeight: 240, overflow: 'auto' }}>
              {exportJson}
            </pre>
          ) : null}
          {err ? <p className="error">{err}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
