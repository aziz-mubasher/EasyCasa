'use client';

import { useRef, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Badge } from '@/components/ui/Badge';
import { euro, area } from '@/lib/format';
import type { ListingSummary } from '@easycasa/shared';

function imageUrlsFor(l: ListingSummary): string[] {
  if (l.imageUrls && l.imageUrls.length > 0) return l.imageUrls;
  return l.coverUrl ? [l.coverUrl] : [];
}

export function ListingCard({ l }: { l: ListingSummary }) {
  const rent = l.transactionType === 'rent';
  const urls = imageUrlsFor(l);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || urls.length < 2) return;
    const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
    setActive(Math.min(Math.max(i, 0), urls.length - 1));
  };

  return (
    <Link
      href={`/listings/${l.slug}`}
      className="group block rounded-xl2 overflow-hidden border border-line bg-paper hover:border-ink transition"
    >
      <div className="aspect-[4/3] bg-sand relative overflow-hidden">
        {urls.length > 0 ? (
          <>
            <div
              ref={scrollerRef}
              onScroll={onScroll}
              className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {urls.map((url, i) => (
                <img
                  key={`${url}-${i}`}
                  src={url}
                  alt={i === 0 ? l.title : `${l.title} — ${i + 1}`}
                  draggable={false}
                  className="h-full w-full min-w-full shrink-0 snap-center object-cover"
                />
              ))}
            </div>
            {urls.length > 1 && (
              <div
                className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none"
                aria-hidden
              >
                {urls.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition ${
                      i === active ? 'bg-paper' : 'bg-paper/45'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="h-full w-full grid place-items-center text-muted data text-xs">EasyCasa</div>
        )}
        <div className="absolute top-3 left-3">
          <Badge tone={rent ? 'pine' : 'ink'}>{rent ? 'rent' : 'sale'}</Badge>
        </div>
      </div>
      <div className="p-4">
        <div className="data text-lg font-medium">
          {euro(l.price)}
          {rent && <span className="text-muted text-sm">/mese</span>}
        </div>
        <h3 className="font-display font-medium mt-0.5 line-clamp-1">{l.title}</h3>
        <p className="text-muted text-sm">{l.city ?? '—'}</p>
        <div className="data text-xs text-muted mt-2 flex gap-3">
          {l.bedrooms != null && <span>{l.bedrooms} cam</span>}
          {l.bathrooms != null && <span>{l.bathrooms} bg</span>}
          <span>{area(l.sizeSqm)}</span>
        </div>
      </div>
    </Link>
  );
}
