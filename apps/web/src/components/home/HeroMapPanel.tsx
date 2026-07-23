'use client';

import { Link } from '@/i18n/routing';
import type { ListingSummary } from '@easycasa/shared';
import { MapView } from '@/components/search/MapView';

export function HeroMapPanel({ items, ariaLabel }: { items: ListingSummary[]; ariaLabel: string }) {
  return (
    <Link
      href="/search"
      className="group relative block aspect-square rounded-xl2 border border-line overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure"
      aria-label={ariaLabel}
    >
      <MapView
        items={items}
        showNavigation={false}
        interactive={false}
        framed={false}
        className="absolute inset-0"
      />
      {/* Cadastral grid overlay — keeps civic framing over live tiles */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30 mix-blend-multiply"
        aria-hidden
      />
      <span className="eyebrow absolute bottom-3 left-3 z-[2] bg-paper/85 px-1.5 py-0.5 rounded shadow-sm">
        foglio · particella
      </span>
    </Link>
  );
}
