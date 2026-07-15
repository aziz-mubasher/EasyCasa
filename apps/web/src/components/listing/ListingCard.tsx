import { Link } from '@/i18n/routing';
import { Badge } from '@/components/ui/Badge';
import { euro, area } from '@/lib/format';
import type { ListingSummary } from '@easycasa/shared';

export function ListingCard({ l }: { l: ListingSummary }) {
  const rent = l.transactionType === 'rent';
  return (
    <Link href={`/listings/${l.slug}`} className="group block rounded-xl2 overflow-hidden border border-line bg-paper hover:border-ink transition">
      <div className="aspect-[4/3] bg-sand relative overflow-hidden">
        {l.coverUrl ? (
          <img src={l.coverUrl} alt={l.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted data text-xs">EasyCasa</div>
        )}
        <div className="absolute top-3 left-3">
          <Badge tone={rent ? 'pine' : 'ink'}>{rent ? 'rent' : 'sale'}</Badge>
        </div>
      </div>
      <div className="p-4">
        <div className="data text-lg font-medium">
          {euro(l.price)}{rent && <span className="text-muted text-sm">/mese</span>}
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
