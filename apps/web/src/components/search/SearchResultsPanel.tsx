'use client';

import { useState } from 'react';
import { ListingCard } from '@/components/listing/ListingCard';
import { MapView } from '@/components/search/MapView';
import type { ListingSummary } from '@easycasa/shared';

export function SearchResultsPanel({ items }: { items: ListingSummary[] }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      <div className="grid sm:grid-cols-2 gap-5">
        {items.map((l) => (
          <div
            key={l.id}
            onMouseEnter={() => setHighlightedId(l.id)}
            onMouseLeave={() => setHighlightedId(null)}
            className={highlightedId === l.id ? 'ring-2 ring-azure rounded-xl2' : ''}
          >
            <ListingCard l={l} />
          </div>
        ))}
      </div>
      <div className="hidden lg:block h-[70vh] sticky top-20">
        <MapView items={items} highlightedId={highlightedId} onHighlight={setHighlightedId} />
      </div>
    </div>
  );
}
