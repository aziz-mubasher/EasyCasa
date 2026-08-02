import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { useApi } from '../../api';
import { Table } from '../../components/ui';

export function CrmSettings() {
  const api = useApi();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['crm', 'settings'],
    queryFn: () => api.crmSettings(),
  });

  if (isLoading) return <p className="muted">Loading settings…</p>;
  if (isError || !data) return <p className="error">Failed to load CRM settings.</p>;

  return (
    <div className="crm-settings">
      <h2>Assignment & retention</h2>
      <p>
        Dormant seeker retention:{' '}
        <span className="mono">{data.retentionMonths} months</span> (read-only; counsel to confirm)
      </p>
      <p>
        Feature flag: <code className="mono">CRM_ENABLED={String(data.crmEnabled)}</code>
      </p>
      <p className="muted">{data.gate}</p>

      <h2>Role matrix</h2>
      <Table columns={['Role', 'Access']} empty={data.roleMatrix.length === 0}>
        {data.roleMatrix.map((r) => (
          <tr key={r.role}>
            <td className="mono">{r.role}</td>
            <td>{r.access}</td>
          </tr>
        ))}
      </Table>

      <h2>Pipelines (fixed v1)</h2>
      {Object.entries(data.pipelines).map(([name, stages]) => (
        <p key={name}>
          <strong>{name}</strong>: {(stages as string[]).join(' → ')}
        </p>
      ))}
    </div>
  );
}
