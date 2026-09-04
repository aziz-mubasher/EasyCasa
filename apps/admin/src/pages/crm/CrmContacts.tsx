import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmSourceLabel } from '@easycasa/shared';

import { useApi } from '../../api';
import { Badge, Table } from '../../components/ui';

export function CrmContacts({ onOpenContact }: { onOpenContact: (id: string) => void }) {
  const api = useApi();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [stage, setStage] = useState('');
  const [source, setSource] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'contacts', query, role, stage, source],
    queryFn: () =>
      api.crmListContacts({
        query: query || undefined,
        role: role || undefined,
        stage: stage || undefined,
        source: source || undefined,
      }),
  });

  return (
    <div>
      <div className="crm-filters">
        <input
          className="input"
          placeholder="Search name, email, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="seeker">Seeker</option>
          <option value="owner">Owner</option>
          <option value="b4a">B4A</option>
          <option value="partner">Partner</option>
        </select>
        <input
          className="input"
          placeholder="Stage filter"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        />
        <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          <option value="aste">Easy Legenda</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="enquiry">Enquiry</option>
          <option value="b4a_referral">B4A</option>
          <option value="partner_intake">Partner</option>
          <option value="import">Import</option>
          <option value="manual">Manual</option>
        </select>
      </div>
      {isLoading ? <p className="muted">Loading…</p> : null}
      {isError ? <p className="error">Failed to load contacts.</p> : null}
      <Table columns={['Name', 'Email', 'Phone', 'Source', 'Tags', '']} empty={!data?.items.length}>
        {(data?.items ?? []).map((c) => (
          <tr key={c.id}>
            <td>
              <button type="button" className="linkish" onClick={() => onOpenContact(c.id)}>
                {c.fullName}
              </button>
            </td>
            <td className="mono">{c.email ?? '—'}</td>
            <td className="mono">{c.phone ?? '—'}</td>
            <td>
              <Badge variant={c.source === 'aste' ? 'amber' : 'grey'}>{crmSourceLabel(c.source)}</Badge>
            </td>
            <td>
              {(c.tags ?? []).map((t) => (
                <span key={t} className="crm-tag">
                  {t}
                </span>
              ))}
            </td>
            <td>
              <button type="button" className="btn btn--sm" onClick={() => onOpenContact(c.id)}>
                Open
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
