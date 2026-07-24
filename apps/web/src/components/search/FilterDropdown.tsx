'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function FilterDropdown({
  label,
  badge,
  children,
  footer,
  className = '',
  active = false,
  panelClassName = '',
}: {
  label: string;
  badge?: number;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Highlight trigger when this filter has a value applied. */
  active?: boolean;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const highlighted = open || active;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure ${
          highlighted
            ? 'border-azure text-azure bg-azure/5'
            : 'border-line bg-paper text-ink hover:border-ink'
        }`}
      >
        <span className="whitespace-nowrap">{label}</span>
        {badge != null && badge > 0 && (
          <span className="data bg-azure text-paper text-[0.65rem] min-w-[1.25rem] h-5 px-1.5 rounded-full inline-flex items-center justify-center">
            {badge}
          </span>
        )}
        <span aria-hidden="true" className="text-[0.65rem] opacity-60">
          ▾
        </span>
      </button>
      {open && (
        <div
          id={`${id}-panel`}
          role="dialog"
          aria-labelledby={`${id}-trigger`}
          className={`absolute z-30 mt-1 min-w-[16rem] rounded-xl border border-line bg-paper p-4 shadow-lg ${panelClassName}`}
        >
          {children}
          {footer && <div className="mt-3 flex gap-2 justify-end border-t border-line pt-3">{footer}</div>}
        </div>
      )}
    </div>
  );
}
