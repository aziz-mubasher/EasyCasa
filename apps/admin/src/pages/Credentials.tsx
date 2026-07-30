import React, { useMemo, useState } from 'react';

import type { CredentialType, Professional } from '@easycasa/api-client';
import { useProfessionals, useVerifyCredential } from '../hooks';
import { useApi } from '../api';
import { Badge, Table, type BadgeVariant } from '../components/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CRED_STATUS_VARIANT: Record<string, BadgeVariant> = {
  PENDING: 'amber',
  VERIFIED: 'green',
  REJECTED: 'red',
};

const CRED_TYPES: CredentialType[] = [
  'REA_MEDIATORE',
  'RC_PROFESSIONALE',
  'ALBO_ISCRIZIONE',
  'CENED_ACCREDITAMENTO',
  'PARTITA_IVA',
  'APE_CERTIFIER',
  'ALBO_TECNICO',
  'RC_INSURANCE',
  'PHOTOGRAPHER',
  'NOTAIO',
];

type Tab = 'expiring' | 'all' | 'add';

interface Row {
  professional: Professional;
  type: CredentialType;
  status: string;
  reference?: string;
  expiresAt?: string;
  documentUrl?: string;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function Credentials() {
  const { data, isLoading, isError } = useProfessionals();
  const verify = useVerifyCredential();
  const api = useApi();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('expiring');
  const [reason, setReason] = useState('');

  const addPro = useMutation({
    mutationFn: (body: { displayName: string; coverageProvinces: string[] }) =>
      api.createProfessional(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['professionals'] }),
  });
  const addCred = useMutation({
    mutationFn: (v: {
      professionalId: string;
      type: CredentialType;
      reference?: string;
      expiresAt?: string;
      documentUrl?: string;
    }) => api.addCredential(v.professionalId, v),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['professionals'] }),
  });
  const setCoverage = useMutation({
    mutationFn: (v: { professionalId: string; coverageProvinces: string[] }) =>
      api.setCoverage(v.professionalId, v.coverageProvinces),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['professionals'] }),
  });
  const unredact = useMutation({
    mutationFn: (v: { professionalId: string; reason: string }) =>
      api.unredactProfessional(v.professionalId, v.reason),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['professionals'] }),
  });

  const rows: Row[] = useMemo(() => {
    const all: Row[] = (data ?? []).flatMap((p) =>
      p.credentials.map((c) => ({
        professional: p,
        type: c.type,
        status: c.status,
        ...(c.reference ? { reference: c.reference } : {}),
        ...(c.expiresAt ? { expiresAt: c.expiresAt } : {}),
        ...(c.documentUrl ? { documentUrl: c.documentUrl } : {}),
      })),
    );
    return all;
  }, [data]);

  const expiring = useMemo(() => {
    return rows
      .filter((r) => {
        const d = daysUntil(r.expiresAt);
        return d !== null && d <= 30;
      })
      .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
  }, [rows]);

  if (isLoading) return <p className="muted">Loading professionals…</p>;
  if (isError) return <p className="error">Failed to load professionals.</p>;

  const shown = tab === 'expiring' ? expiring : rows;

  return (
    <section>
      <h1>Credentials</h1>
      <p className="muted">
        Operations queue. Default tab: expiring within 30 days (empty = success). Verify requires a
        reason (audit). CENED blocks APE coverage when missing. Support sees redacted names —
        unredact is one record at a time with a typed reason.
      </p>

      {(data ?? []).some((p) => p.redacted) ? (
        <p className="muted" style={{ marginBottom: '1rem' }}>
          Viewing redacted projection. To reveal one professional, enter a reason below and click
          Reveal on that row.
        </p>
      ) : null}

      <div className="actions" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={`btn btn--sm${tab === 'expiring' ? ' btn--primary' : ''}`}
          onClick={() => setTab('expiring')}
        >
          Expiring ≤30d ({expiring.length})
        </button>
        <button
          type="button"
          className={`btn btn--sm${tab === 'all' ? ' btn--primary' : ''}`}
          onClick={() => setTab('all')}
        >
          All credentials
        </button>
        <button
          type="button"
          className={`btn btn--sm${tab === 'add' ? ' btn--primary' : ''}`}
          onClick={() => setTab('add')}
        >
          Add / coverage
        </button>
      </div>

      {tab === 'add' ? (
        <AddPanel
          professionals={data ?? []}
          onAddPro={(v) => addPro.mutate(v)}
          onAddCred={(v) => addCred.mutate(v)}
          onCoverage={(v) => setCoverage.mutate(v)}
          busy={addPro.isPending || addCred.isPending || setCoverage.isPending}
        />
      ) : (
        <>
          <label className="muted" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Audit reason (required for verify/reject)
            <input
              style={{ display: 'block', width: '100%', marginTop: 4 }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. REA screenshot matches MI-12345"
            />
          </label>
          <Table
            columns={['Professional', 'Credential', 'Reference', 'Expires', 'Status', 'Action']}
            empty={shown.length === 0}
          >
            {shown.map((r) => {
              const d = daysUntil(r.expiresAt);
              return (
                <tr key={`${r.professional.id}-${r.type}`}>
                  <td>
                    <div>{r.professional.displayName}</div>
                    <div className="mono muted">{r.professional.coverageProvinces.join(', ')}</div>
                    {r.professional.redacted ? (
                      <button
                        type="button"
                        className="btn btn--sm"
                        style={{ marginTop: 4 }}
                        disabled={unredact.isPending || reason.trim().length < 5}
                        onClick={() => {
                          const why = reason.trim();
                          if (why.length < 5) return;
                          unredact.mutate({ professionalId: r.professional.id, reason: why });
                        }}
                      >
                        Reveal…
                      </button>
                    ) : null}
                  </td>
                  <td>{r.type}</td>
                  <td className="mono">{r.reference ?? '—'}</td>
                  <td>
                    {r.expiresAt ?? '—'}
                    {d !== null && d <= 30 ? (
                      <span className="muted"> ({d}d)</span>
                    ) : null}
                  </td>
                  <td>
                    <Badge variant={CRED_STATUS_VARIANT[r.status] ?? 'grey'}>{r.status}</Badge>
                  </td>
                  <td>
                    {r.status === 'PENDING' ? (
                      <div className="actions">
                        <button
                          className="btn btn--sm btn--primary"
                          disabled={verify.isPending || reason.trim().length < 3}
                          onClick={() =>
                            verify.mutate({
                              professionalId: r.professional.id,
                              type: r.type,
                              status: 'VERIFIED',
                              reason: reason.trim(),
                            })
                          }
                        >
                          Verify
                        </button>
                        <button
                          className="btn btn--sm btn--danger"
                          disabled={verify.isPending || reason.trim().length < 3}
                          onClick={() =>
                            verify.mutate({
                              professionalId: r.professional.id,
                              type: r.type,
                              status: 'REJECTED',
                              reason: reason.trim(),
                            })
                          }
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
          {tab === 'expiring' && shown.length === 0 ? (
            <p className="muted">No credentials expiring within 30 days — good.</p>
          ) : null}
        </>
      )}
    </section>
  );
}

function AddPanel({
  professionals,
  onAddPro,
  onAddCred,
  onCoverage,
  busy,
}: {
  professionals: Professional[];
  onAddPro: (v: { displayName: string; coverageProvinces: string[] }) => void;
  onAddCred: (v: {
    professionalId: string;
    type: CredentialType;
    reference?: string;
    expiresAt?: string;
    documentUrl?: string;
  }) => void;
  onCoverage: (v: { professionalId: string; coverageProvinces: string[] }) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const [provinces, setProvinces] = useState('MI');
  const [proId, setProId] = useState('');
  const [type, setType] = useState<CredentialType>('CENED_ACCREDITAMENTO');
  const [reference, setReference] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [cov, setCov] = useState('');

  return (
    <div className="stack" style={{ display: 'grid', gap: '1.5rem', maxWidth: 520 }}>
      <fieldset>
        <legend>New professional</legend>
        <input placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="Provinces (comma)"
          value={provinces}
          onChange={(e) => setProvinces(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy || name.trim().length < 2}
          onClick={() =>
            onAddPro({
              displayName: name.trim(),
              coverageProvinces: provinces.split(',').map((p) => p.trim().toUpperCase()).filter(Boolean),
            })
          }
        >
          Create
        </button>
      </fieldset>

      <fieldset>
        <legend>Add credential</legend>
        <select value={proId} onChange={(e) => setProId(e.target.value)}>
          <option value="">Select professional…</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as CredentialType)}>
          {CRED_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <input
          placeholder="Document URL"
          value={documentUrl}
          onChange={(e) => setDocumentUrl(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy || !proId}
          onClick={() =>
            onAddCred({
              professionalId: proId,
              type,
              ...(reference ? { reference } : {}),
              ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
              ...(documentUrl ? { documentUrl } : {}),
            })
          }
        >
          Add credential
        </button>
      </fieldset>

      <fieldset>
        <legend>Edit coverage provinces</legend>
        <select value={proId} onChange={(e) => setProId(e.target.value)}>
          <option value="">Select professional…</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} ({p.coverageProvinces.join(',')})
            </option>
          ))}
        </select>
        <input
          placeholder="MI,BG,BS"
          value={cov}
          onChange={(e) => setCov(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy || !proId}
          onClick={() =>
            onCoverage({
              professionalId: proId,
              coverageProvinces: cov.split(',').map((p) => p.trim().toUpperCase()).filter(Boolean),
            })
          }
        >
          Save coverage
        </button>
      </fieldset>
    </div>
  );
}
