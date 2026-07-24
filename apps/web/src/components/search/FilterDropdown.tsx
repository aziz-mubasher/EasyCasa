'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type PanelPos = { top: number; left: number; minWidth: number };

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
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const highlighted = open || active;

  useEffect(() => setMounted(true), []);

  const updatePos = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gutter = 8;
    const minWidth = Math.max(r.width, 256);
    let left = r.left;
    if (left + minWidth > window.innerWidth - gutter) {
      left = Math.max(gutter, window.innerWidth - minWidth - gutter);
    }
    setPos({
      top: r.bottom + 4,
      left,
      minWidth,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    const onScroll = () => updatePos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const panel =
    open && mounted && pos ? (
      <div
        ref={panelRef}
        id={`${id}-panel`}
        role="dialog"
        aria-labelledby={`${id}-trigger`}
        style={{ top: pos.top, left: pos.left, minWidth: pos.minWidth }}
        className={`fixed z-[80] rounded-xl border border-line bg-paper p-4 shadow-lg ${panelClassName}`}
      >
        {children}
        {footer && <div className="mt-3 flex gap-2 justify-end border-t border-line pt-3">{footer}</div>}
      </div>
    ) : null;

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        ref={triggerRef}
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
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
