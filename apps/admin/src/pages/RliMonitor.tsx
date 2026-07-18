import React from 'react';

import { useLeases } from '../hooks';
import { Badge, Table } from '../components/ui';
import {
  formatEuroCents,
  leaseUrgency,
  registrationDeadline,
  urgencyVariant,
} from '../lib/format';

const URGENCY_LABEL = {
  registered: 'Registered',
  overdue: 'Overdue',
  urgent: 'Due soon',
  soon: 'Upcoming',
  ok: 'On track',
} as const;

export function RliMonitor() {
  const { data, isLoading, isError } = useLeases();
  const now = new Date();

  if (isLoading) return <p className="muted">Loading leases…</p>;
  if (isError) return <p className="error">Failed to load leases.</p>;

  const leases = data ?? [];
  // Most urgent first: overdue, then fewest days remaining.
  const withUrgency = leases
    .map((l) => ({ lease: l, ...leaseUrgency(l, now) }))
    .sort((a, b) => {
      if (a.urgency === 'registered' && b.urgency !== 'registered') return 1;
      if (b.urgency === 'registered' && a.urgency !== 'registered') return -1;
      return a.days - b.days;
    });

  const overdue = withUrgency.filter((r) => r.urgency === 'overdue').length;

  return (
    <section>
      <h1>RLI registration monitor</h1>
      <p className="muted">Leases must be registered within 30 days of the earlier of signing or start.</p>
      {overdue > 0 ? (
        <p className="banner banner--danger">
          {overdue} lease{overdue === 1 ? '' : 's'} past the registration deadline.
        </p>
      ) : null}
      <Table
        columns={['Lease', 'Type', 'Annual rent', 'Cedolare', 'Deadline', 'Days', 'Status']}
        empty={withUrgency.length === 0}
      >
        {withUrgency.map(({ lease, urgency, days }) => (
          <tr key={lease.id}>
            <td className="mono">{lease.id}</td>
            <td>{lease.type}</td>
            <td>{formatEuroCents(lease.annualRentCents)}</td>
            <td>{lease.cedolareSecca ? 'Yes' : 'No'}</td>
            <td>{lease.registrationProtocollo ? lease.registrationProtocollo : registrationDeadline(lease)}</td>
            <td className="mono">{urgency === 'registered' ? '—' : days}</td>
            <td>
              <Badge variant={urgencyVariant(urgency)}>{URGENCY_LABEL[urgency]}</Badge>
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
