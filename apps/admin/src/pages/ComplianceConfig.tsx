import React from 'react';

import type { LegalBasis, RequiredCredential } from '@easycasa/api-client';
import { useCatalog, useSetLegalBasis, useSetRequiredCredential } from '../hooks';
import { Badge, Table, type BadgeVariant } from '../components/ui';

const LEGAL_BASES: LegalBasis[] = ['MEDIAZIONE', 'MANDATO_ONEROSO', 'REVIEW_REQUIRED'];
const REQUIRED_CREDENTIALS: RequiredCredential[] = [
  'NONE',
  'REA_MEDIATORE',
  'ALBO_TECNICO',
  'APE_CERTIFIER',
  'PHOTOGRAPHER',
  'NOTAIO',
];

function basisVariant(b: LegalBasis | undefined): BadgeVariant {
  if (b === 'REVIEW_REQUIRED' || b === undefined) return 'red';
  return 'green';
}

export function ComplianceConfig() {
  const { data, isLoading, isError } = useCatalog();
  const setBasis = useSetLegalBasis();
  const setCred = useSetRequiredCredential();

  if (isLoading) return <p className="muted">Loading catalog…</p>;
  if (isError) return <p className="error">Failed to load catalog.</p>;

  const items = data ?? [];
  const unreviewed = items.filter((i) => (i.legalBasis ?? 'REVIEW_REQUIRED') === 'REVIEW_REQUIRED').length;

  return (
    <section>
      <h1>Compliance configuration</h1>
      <p className="muted">
        Set each service's legal basis and required credential. Items left as REVIEW_REQUIRED block mandates from
        being sent.
      </p>
      {unreviewed > 0 ? (
        <p className="banner banner--warn">
          {unreviewed} service{unreviewed === 1 ? '' : 's'} still need a legal-basis review.
        </p>
      ) : null}
      <Table columns={['Service', 'Category', 'Legal basis', 'Required credential']} empty={items.length === 0}>
        {items.map((item) => (
          <tr key={item.code}>
            <td>
              <div>{item.labelEn}</div>
              <div className="mono muted">{item.code}</div>
            </td>
            <td>{item.category}</td>
            <td>
              <div className="cell-inline">
                <Badge variant={basisVariant(item.legalBasis)}>{item.legalBasis ?? 'REVIEW_REQUIRED'}</Badge>
                <select
                  value={item.legalBasis ?? 'REVIEW_REQUIRED'}
                  disabled={setBasis.isPending}
                  onChange={(e) => setBasis.mutate({ code: item.code, legalBasis: e.target.value as LegalBasis })}
                >
                  {LEGAL_BASES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </td>
            <td>
              <select
                value={item.requiredCredential ?? 'NONE'}
                disabled={setCred.isPending}
                onChange={(e) =>
                  setCred.mutate({ code: item.code, requiredCredential: e.target.value as RequiredCredential })
                }
              >
                {REQUIRED_CREDENTIALS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </Table>
    </section>
  );
}
