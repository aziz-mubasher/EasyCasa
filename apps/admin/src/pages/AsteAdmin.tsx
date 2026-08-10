import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useApi } from '../api';
import { Badge } from '../components/ui';

type Tab = 'analyses' | 'failures' | 'waitlist';

const ListItemSchema = z.object({
  id: z.string(),
  userRef: z.string(),
  status: z.string(),
  attempts: z.number(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  processingStartedAt: z.string().nullable().optional(),
  stageTimingSummary: z
    .object({
      processingStartedAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      ageMs: z.number().nullable(),
      attempts: z.number(),
    })
    .optional(),
  failureReasonCategory: z.string().nullable(),
  language: z.string(),
  register: z.string(),
  provincia: z.string().nullable(),
});

const ListSchema = z.object({
  items: z.array(ListItemSchema),
  nextCursor: z.string().nullable(),
});

const DetailSchema = z.object({
  id: z.string(),
  userRef: z.string(),
  status: z.string(),
  attempts: z.number(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  processingStartedAt: z.string().nullable().optional(),
  failureReasonCategory: z.string().nullable(),
  failureReason: z.string().nullable().optional(),
  language: z.string(),
  register: z.string(),
  provincia: z.string().nullable(),
  comune: z.string().nullable().optional(),
  tribunale: z.string().nullable().optional(),
  rge: z.string().nullable().optional(),
  lotto: z.string().nullable().optional(),
  stageHistory: z.array(z.object({ at: z.string().nullable(), event: z.string() })),
  documents: z.array(
    z.object({
      id: z.string(),
      docType: z.string(),
      filenameMasked: z.string(),
      sizeBytes: z.number(),
      pageCount: z.number().nullable(),
      ocrStatus: z.string(),
      ocrRatio: z.number().nullable(),
      mime: z.string().optional(),
      createdAt: z.string().nullable().optional(),
    }),
  ),
  chatMessageCount: z.number(),
});

const WaitlistSchema = z.object({
  total: z.number(),
  byLanguage: z.array(z.object({ language: z.string(), count: z.number() })),
  byProvince: z.array(z.object({ province: z.string().nullable(), count: z.number() })),
  byBuyerType: z.array(z.object({ buyerType: z.string().nullable(), count: z.number() })),
  signupsByDay: z.array(z.object({ day: z.string(), count: z.number() })),
});

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.replace('T', ' ').slice(0, 19);
}

export function AsteAdmin() {
  const api = useApi();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('analyses');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealIdentity, setRevealIdentity] = useState<{
    email: string | null;
    displayName: string | null;
  } | null>(null);
  const [revealedNames, setRevealedNames] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.location.hash = selectedId ? `aste/${selectedId}` : 'aste';
  }, [selectedId]);

  useEffect(() => {
    setRevealIdentity(null);
    setRevealedNames(null);
    setError(null);
  }, [selectedId]);

  const list = useQuery({
    queryKey: ['aste-admin', tab],
    queryFn: async () =>
      ListSchema.parse(
        await api.listAsteAnalyses({
          failuresOnly: tab === 'failures',
          staleMinutes: 45,
          limit: 50,
        }),
      ),
    enabled: tab === 'analyses' || tab === 'failures',
    refetchInterval: 20_000,
  });

  const waitlist = useQuery({
    queryKey: ['aste-waitlist'],
    queryFn: async () => WaitlistSchema.parse(await api.getAsteWaitlistStats()),
    enabled: tab === 'waitlist',
    refetchInterval: 60_000,
  });

  const detail = useQuery({
    queryKey: ['aste-admin', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      if (!selectedId) throw new Error('no id');
      return DetailSchema.parse(await api.getAsteAnalysis(selectedId));
    },
  });

  const rerun = useMutation({
    mutationFn: async (id: string) => api.rerunAsteAnalysis(id),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['aste-admin'] });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : 'Re-run failed');
    },
  });

  const revealIdMut = useMutation({
    mutationFn: async (id: string) =>
      z
        .object({
          email: z.string().nullable(),
          displayName: z.string().nullable(),
          auditId: z.string(),
        })
        .parse(await api.revealAsteIdentity(id, 'support')),
    onSuccess: (data) => {
      setRevealIdentity({ email: data.email, displayName: data.displayName });
    },
  });

  const revealFnMut = useMutation({
    mutationFn: async (id: string) =>
      z
        .object({
          auditId: z.string(),
          documents: z.array(
            z.object({ id: z.string(), originalFilename: z.string(), docType: z.string() }),
          ),
        })
        .parse(await api.revealAsteFilenames(id, 'support')),
    onSuccess: (data) => {
      const map: Record<string, string> = {};
      for (const d of data.documents) map[d.id] = d.originalFilename;
      setRevealedNames(map);
    },
  });

  return (
    <div className="aste-admin">
      <header className="page-head" style={{ marginBottom: '1.25rem' }}>
        <p className="muted" style={{ margin: 0 }}>
          Ops · dark-mode visibility
        </p>
        <h1 style={{ margin: '0.25rem 0 0' }}>Aste</h1>
        <p className="muted" style={{ marginTop: '0.35rem', maxWidth: '40rem' }}>
          Analyses, failures (re-run), and G1 waitlist aggregates. Masked by default — no document
          text, extraction, or chat content.
        </p>
      </header>

      <div className="aste-admin__tabs" role="tablist" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(
          [
            ['analyses', 'Analyses'],
            ['failures', 'Failures'],
            ['waitlist', 'Waitlist (G1)'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`btn${tab === key ? ' btn--primary' : ''}`}
            onClick={() => {
              setTab(key);
              setSelectedId(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="wa-audit-banner" role="alert">
          {error}
        </p>
      ) : null}

      {tab === 'waitlist' ? (
        <div>
          {waitlist.isLoading ? <p className="muted">Loading…</p> : null}
          {waitlist.data ? (
            <div className="aste-admin__waitlist">
              <p>
                <strong>{waitlist.data.total}</strong> signups (counts only — no emails)
              </p>
              <section>
                <h2>By language</h2>
                <ul>
                  {waitlist.data.byLanguage.map((r) => (
                    <li key={r.language}>
                      <span className="mono">{r.language}</span> — {r.count}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2>By province</h2>
                <ul>
                  {waitlist.data.byProvince.map((r) => (
                    <li key={String(r.province)}>
                      <span className="mono">{r.province ?? '(none)'}</span> — {r.count}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2>By buyer type</h2>
                <ul>
                  {waitlist.data.byBuyerType.map((r) => (
                    <li key={String(r.buyerType)}>
                      <span className="mono">{r.buyerType ?? '(none)'}</span> — {r.count}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h2>Signups by day (90d)</h2>
                <ul className="mono" style={{ maxHeight: '16rem', overflow: 'auto' }}>
                  {waitlist.data.signupsByDay.map((r) => (
                    <li key={r.day}>
                      {r.day} — {r.count}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 1fr' : '1fr', gap: '1rem' }}>
          <div>
            {list.isLoading ? <p className="muted">Loading…</p> : null}
            {list.data?.items.length === 0 ? (
              <p className="wa-empty">No rows.</p>
            ) : (
              <table className="table" style={{ width: '100%', fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>User</th>
                    <th>Attempts</th>
                    <th>Fail</th>
                    <th>Lang</th>
                    <th>Prov</th>
                    <th>Updated</th>
                    {tab === 'failures' ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {list.data?.items.map((row) => (
                    <tr
                      key={row.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td>
                        <Badge>{row.status}</Badge>
                      </td>
                      <td className="mono">{row.userRef}</td>
                      <td className="tabular-nums">{row.attempts}</td>
                      <td className="mono">{row.failureReasonCategory ?? '—'}</td>
                      <td className="mono">
                        {row.language}/{row.register}
                      </td>
                      <td className="mono">{row.provincia ?? '—'}</td>
                      <td className="mono">{formatWhen(row.updatedAt)}</td>
                      {tab === 'failures' ? (
                        <td>
                          <button
                            type="button"
                            className="btn"
                            disabled={rerun.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              rerun.mutate(row.id);
                            }}
                          >
                            Re-run
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedId ? (
            <div className="aste-admin__detail">
              <button type="button" className="btn" onClick={() => setSelectedId(null)}>
                Close
              </button>
              {detail.isLoading ? <p className="muted">Loading detail…</p> : null}
              {detail.data ? (
                <div>
                  <h2 className="mono" style={{ fontSize: '1rem' }}>
                    {detail.data.id}
                  </h2>
                  <p>
                    <Badge>{detail.data.status}</Badge> · attempts {detail.data.attempts} · user{' '}
                    <span className="mono">{detail.data.userRef}</span>
                  </p>
                  <p className="muted">
                    {detail.data.language}/{detail.data.register} · {detail.data.provincia ?? '—'} ·{' '}
                    {detail.data.comune ?? '—'}
                  </p>
                  {detail.data.failureReason ? (
                    <p>
                      Failure: <span className="mono">{detail.data.failureReasonCategory}</span>{' '}
                      <span className="muted mono">({detail.data.failureReason})</span>
                    </p>
                  ) : null}
                  <p className="muted">Chat messages (count only): {detail.data.chatMessageCount}</p>

                  <h3>Stage history</h3>
                  <ul className="mono">
                    {detail.data.stageHistory.map((s, i) => (
                      <li key={`${s.event}-${i}`}>
                        {formatWhen(s.at)} — {s.event}
                      </li>
                    ))}
                  </ul>

                  <h3>Documents</h3>
                  <ul>
                    {detail.data.documents.map((d) => (
                      <li key={d.id}>
                        <span className="mono">{d.docType}</span> ·{' '}
                        {revealedNames?.[d.id] ?? d.filenameMasked} · {d.sizeBytes} B · pages{' '}
                        {d.pageCount ?? '—'} · OCR {d.ocrStatus}
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={revealIdMut.isPending}
                      onClick={() => revealIdMut.mutate(detail.data.id)}
                    >
                      Reveal identity (audited)
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={revealFnMut.isPending}
                      onClick={() => revealFnMut.mutate(detail.data.id)}
                    >
                      Reveal filenames (audited)
                    </button>
                    {detail.data.status === 'failed' || detail.data.status === 'processing' ? (
                      <button
                        type="button"
                        className="btn btn--primary"
                        disabled={rerun.isPending}
                        onClick={() => rerun.mutate(detail.data.id)}
                      >
                        Re-run
                      </button>
                    ) : null}
                  </div>

                  {revealIdentity ? (
                    <p className="wa-audit-banner" style={{ marginTop: '0.75rem' }}>
                      Identity: {revealIdentity.displayName ?? '—'} ·{' '}
                      <span className="mono">{revealIdentity.email ?? '—'}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
