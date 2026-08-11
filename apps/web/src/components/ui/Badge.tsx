import type { HTMLAttributes, ReactNode } from 'react';

export function Badge({
  children,
  tone = 'ink',
  ...rest
}: {
  children: ReactNode;
  tone?: 'ink' | 'pine' | 'azure';
} & HTMLAttributes<HTMLSpanElement>) {
  const bg = tone === 'pine' ? 'bg-pine' : tone === 'azure' ? 'bg-azure' : 'bg-ink';
  return (
    <span
      {...rest}
      className={`data ${bg} text-paper text-[0.68rem] px-2 py-0.5 rounded-full uppercase tracking-wide`}
    >
      {children}
    </span>
  );
}
