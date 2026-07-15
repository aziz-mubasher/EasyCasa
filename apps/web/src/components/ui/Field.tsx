import type { InputHTMLAttributes, ReactNode } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-azure focus:outline-none"
      {...props}
    />
  );
}
