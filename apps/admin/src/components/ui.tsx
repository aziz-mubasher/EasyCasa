import React from 'react';

export type BadgeVariant = 'green' | 'amber' | 'red' | 'grey' | 'blue';

export function Badge({ variant, children }: { variant: BadgeVariant; children: React.ReactNode }) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}

export function Table({
  columns,
  children,
  empty,
}: {
  columns: string[];
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {empty ? (
          <tr>
            <td className="table__empty" colSpan={columns.length}>
              Nothing here.
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  );
}
