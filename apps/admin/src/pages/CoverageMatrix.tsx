import React, { useMemo, useState } from 'react';

import type { CoverageMatrixCell } from '@easycasa/api-client';
import { useCoverageMatrix } from '../hooks';
import { Badge, Table } from '../components/ui';

export function CoverageMatrix() {
  const [filter, setFilter] = useState('');
  const provinces = useMemo(
    () =>
      filter
        .split(/[,\s]+/)
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean),
    [filter],
  );
  const { data, isLoading, isError } = useCoverageMatrix(provinces.length > 0 ? provinces : undefined);

  if (isLoading) return <p className="muted">Loading coverage matrix…</p>;
  if (isError) return <p className="error">Failed to load coverage matrix.</p>;

  const cells = data ?? [];
  const byProvince = new Map<string, CoverageMatrixCell[]>();
  for (const cell of cells) {
    const list = byProvince.get(cell.province) ?? [];
    list.push(cell);
    byProvince.set(cell.province, list);
  }

  const unavailable = cells.filter((c) => !c.available && c.qualifiedCount !== -1);
  const demandHot = cells.filter((c) => c.demandCount > 0).sort((a, b) => b.demandCount - a.demandCount);

  return (
    <section>
      <h1>Province coverage</h1>
      <p className="muted">
        EC-10 recruiting board — green = at least one verified professional covers the province for that
        service; red = we must not sell it there. Demand counts come from “notify me” on pricing.
      </p>
      <label className="muted" style={{ display: 'block', marginBottom: '1rem' }}>
        Provinces filter (comma-separated sigle, empty = seeds + known coverage)
        <input
          style={{ display: 'block', marginTop: 6, width: '100%', maxWidth: 420 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="MI, BS, CR, BG"
        />
      </label>

      {unavailable.length > 0 ? (
        <p className="banner banner--warn">
          {unavailable.length} province×item cell{unavailable.length === 1 ? '' : 's'} unavailable.
        </p>
      ) : null}

      {demandHot.length > 0 ? (
        <>
          <h2>Demand signals</h2>
          <Table columns={['Item', 'Province', 'Demand']} empty={false}>
            {demandHot.slice(0, 20).map((c) => (
              <tr key={`d-${c.itemCode}-${c.province}`}>
                <td className="mono">{c.itemCode}</td>
                <td>{c.province}</td>
                <td>{c.demandCount}</td>
              </tr>
            ))}
          </Table>
        </>
      ) : null}

      <h2>Matrix</h2>
      {[...byProvince.entries()].map(([province, rows]) => (
        <div key={province} style={{ marginBottom: '1.5rem' }}>
          <h3>{province}</h3>
          <Table columns={['Service', 'Status', 'Qualified', 'Capacity', 'Demand']} empty={rows.length === 0}>
            {rows.map((cell) => (
              <tr key={`${cell.province}-${cell.itemCode}`}>
                <td className="mono">{cell.itemCode}</td>
                <td>
                  <Badge variant={cell.available ? 'green' : 'red'}>
                    {cell.available ? 'available' : 'unavailable'}
                  </Badge>
                </td>
                <td>{cell.qualifiedCount < 0 ? '—' : cell.qualifiedCount}</td>
                <td>{cell.capacityConstrained ? 'constrained' : 'ok'}</td>
                <td>{cell.demandCount}</td>
              </tr>
            ))}
          </Table>
        </div>
      ))}
    </section>
  );
}
