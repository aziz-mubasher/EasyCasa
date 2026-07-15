import { notFound } from 'next/navigation';
import { getListing } from '@/lib/api';
import { euro, area } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await getListing(slug);
  if (!l) notFound();

  const price = typeof l.price === 'string' ? Number(l.price) : (l.price as number | null);
  const rent = l.transactionType === 'rent';

  return (
    <article className="mx-auto max-w-5xl px-5 py-10">
      <script
        type="application/ld+json"
        // schema.org for rich results
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Residence',
            name: l.title,
            address: l.city,
          }),
        }}
      />
      <p className="eyebrow mb-2">
        {String(l.city ?? '')} {l.latitude ? `· ${Number(l.latitude).toFixed(3)}°N` : ''}
      </p>
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <h1 className="font-display text-4xl font-semibold max-w-2xl">{String(l.title)}</h1>
        <Badge tone={rent ? 'pine' : 'ink'}>{rent ? 'affitto' : 'vendita'}</Badge>
      </div>

      <div className="data text-3xl mt-4">
        {euro(price)}{rent && <span className="text-muted text-lg">/mese</span>}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 max-w-md data text-sm">
        <div><div className="eyebrow">camere</div>{(l.bedrooms as number) ?? '—'}</div>
        <div><div className="eyebrow">bagni</div>{(l.bathrooms as number) ?? '—'}</div>
        <div><div className="eyebrow">superficie</div>{area(l.sizeSqm as number)}</div>
      </div>

      {l.description ? (
        <p className="mt-8 max-w-2xl leading-relaxed whitespace-pre-line">{String(l.description)}</p>
      ) : null}

      <div className="mt-8"><Button>Contatta</Button></div>
    </article>
  );
}
