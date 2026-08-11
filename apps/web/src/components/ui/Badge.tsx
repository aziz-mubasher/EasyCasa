import type { HTMLAttributes, ReactNode } from 'react';

export function Badge({
  children,
  tone = 'ink',
  ...rest
}: {
  children: ReactNode;
  /** `spotlight` = commercial boost (T26) — distinct from trust azure/pine. */
  tone?: 'ink' | 'pine' | 'azure' | 'spotlight';
} & HTMLAttributes<HTMLSpanElement>) {
  const bg =
    tone === 'pine'
      ? 'bg-pine'
      : tone === 'azure'
        ? 'bg-azure'
        : tone === 'spotlight'
          ? 'bg-slate-700'
          : 'bg-ink';
  return (
    <span
      {...rest}
      className={`data ${bg} text-paper text-[0.68rem] px-2 py-0.5 rounded-sm uppercase tracking-wide`}
    >
      {children}
    </span>
  );
}
