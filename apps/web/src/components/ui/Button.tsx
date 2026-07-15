import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'outline';
const styles: Record<Variant, string> = {
  primary: 'bg-azure text-paper hover:brightness-110',
  ghost: 'bg-transparent text-ink hover:bg-sand/60',
  outline: 'border border-line text-ink hover:border-ink',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium font-[var(--font-display)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
