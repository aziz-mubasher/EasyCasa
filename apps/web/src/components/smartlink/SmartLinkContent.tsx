import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

import { ValuationBandPanel } from '@/components/valuation/ValuationBandPanel';
import { PropertyPhotoGallery } from '@/components/smartlink/PropertyPhotoGallery';
import { SmartLinkViewRecorder } from '@/components/smartlink/SmartLinkViewRecorder';
import { fetchSmartLinkPublic, SMARTLINK_VISITOR_COOKIE } from '@/lib/smartlink';
import { area, euro } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

function whatsAppHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

function telHref(phone: string | null): string | null {
  if (!phone) return null;
  return `tel:${phone.replace(/\s/g, '')}`;
}

export async function SmartLinkContent({ token, locale }: { token: string; locale: string }) {
  const t = await getTranslations('smartlink');
  const tf = await getTranslations('search.filters');
  const jar = await cookies();
  const visitor = jar.get(SMARTLINK_VISITOR_COOKIE)?.value ?? null;
  const { data, status } = await fetchSmartLinkPublic(token, visitor);

  if (status === 410) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">{t('revokedTitle')}</h1>
        <p className="mt-3 text-muted">{t('revokedBody')}</p>
      </section>
    );
  }

  if (!data) notFound();

  const listing = data.listing;
  const urls = listing.media.map((m) => m.url);
  const sale = listing.transactionTypes.includes('sale') || listing.transactionType === 'sale';
  const rent = listing.transactionTypes.includes('rent') || listing.transactionType === 'rent';
  const agentName = data.agent.displayName ?? t('defaultAgentName');
  const waAgent = whatsAppHref(data.agent.phone);
  const waAgency = whatsAppHref(data.agency.phone);

  return (
    <>
      <SmartLinkViewRecorder token={token} hadVisitorCookie={Boolean(visitor)} />
      <div className="border-b border-line bg-paper">
        <div className="mx-auto max-w-5xl px-5 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow text-azure">{t('positioning')}</p>
            <h1 className="font-display text-2xl font-semibold text-ink">{agentName}</h1>
            {data.agent.bio ? <p className="mt-1 text-sm text-muted max-w-xl">{data.agent.bio}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {telHref(data.agent.phone) ? (
              <a className="btn-secondary text-sm" href={telHref(data.agent.phone)!}>
                {t('call')}
              </a>
            ) : null}
            {waAgent ? (
              <a className="btn-primary text-sm" href={waAgent} rel="noopener noreferrer" target="_blank">
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <main className="space-y-8 min-w-0">
          <PropertyPhotoGallery title={listing.title} urls={urls.length ? urls : listing.coverUrl ? [listing.coverUrl] : []} />

          <header>
            <p className="eyebrow mb-2">
              {[listing.city, listing.province].filter(Boolean).join(' · ')}
            </p>
            <h2 className="font-display text-3xl font-semibold text-ink">{listing.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {sale ? (
                <Badge tone="ink">
                  {t('forSale')}: {listing.price != null ? euro(listing.price, locale) : t('onRequest')}
                </Badge>
              ) : null}
              {rent ? (
                <Badge tone="pine">
                  {t('forRent')}: {listing.price != null ? `${euro(listing.price, locale)}/m` : t('onRequestPerMonth')}
                </Badge>
              ) : null}
            </div>
          </header>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 data text-sm">
            <div>
              <dt className="eyebrow">{t('rooms')}</dt>
              <dd>{listing.rooms ?? listing.bedrooms ?? '—'}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t('bathrooms')}</dt>
              <dd>{listing.bathrooms ?? '—'}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t('builtSurface')}</dt>
              <dd>{area(listing.sizeSqm)}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t('yearBuilt')}</dt>
              <dd>{listing.yearBuilt ?? '—'}</dd>
            </div>
            <div>
              <dt className="eyebrow">{t('energyRating')}</dt>
              <dd>{listing.energyClass ?? '—'}</dd>
            </div>
          </dl>

          {listing.features.length > 0 ? (
            <section aria-labelledby="smartlink-features">
              <h3 id="smartlink-features" className="eyebrow mb-3">
                {t('characteristics')}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {listing.features.map((slug) => (
                  <li key={slug}>
                    <span className="inline-flex rounded-full border border-line bg-sand px-3 py-1 text-xs text-ink">
                      {tf(`feature.${slug as 'garden'}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.includeValuationBand && data.valuationBand ? (
            <ValuationBandPanel data={data.valuationBand} />
          ) : null}
        </main>

        <aside className="space-y-6">
          <section className="rounded-xl border border-line bg-paper p-5" aria-labelledby="agency-block">
            <h2 id="agency-block" className="font-display text-lg font-semibold text-ink">
              {data.agency.name}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.agency.phone ? (
                <li>
                  <a className="text-azure hover:underline" href={telHref(data.agency.phone)!}>
                    {data.agency.phone}
                  </a>
                </li>
              ) : null}
              <li>
                <a className="text-azure hover:underline" href={`mailto:${data.agency.email}`}>
                  {data.agency.email}
                </a>
              </li>
            </ul>
            {waAgency ? (
              <a className="btn-secondary mt-4 inline-flex text-sm w-full justify-center" href={waAgency} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            ) : null}
          </section>

          <section className="rounded-xl border border-line bg-sand/40 p-5" aria-labelledby="view-stats">
            <h2 id="view-stats" className="font-display text-lg font-semibold text-ink">
              {t('viewStatsTitle')}
            </h2>
            <p className="mt-2 data text-2xl text-ink">
              {data.stats.viewCount} / {data.stats.uniqueViewCount}
            </p>
            <p className="mt-1 text-xs text-muted">{t('viewStatsHint')}</p>
          </section>
        </aside>
      </div>
    </>
  );
}
