import type { ReactNode } from 'react';

export function Badge({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'pine' | 'azure' }) {
  const bg = tone === 'pine' ? 'bg-pine' : tone === 'azure' ? 'bg-azure' : 'bg-ink';
  return (
    <span className={`data ${bg} text-paper text-[0.68rem] px-2 py-0.5 rounded-full uppercase tracking-wide`}>
      {children}
    </span>
  );
}
