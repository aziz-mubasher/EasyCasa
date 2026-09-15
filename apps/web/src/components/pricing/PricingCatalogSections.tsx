'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import type { CatalogItemRow, ServicePackageRow } from '@/lib/api';
import {
  FEATURED_PACKAGE_CODES,
  JOURNEY_ITEM_CODES,
  type PricingJourney,
} from '@/lib/pricing-config';
import { catalogLabel, formatEuroCents, packageLabel } from '@/lib/pricing-display';
import { Button } from '@/components/ui/Button';

type Props = {
  locale: string;
  items: CatalogItemRow[];
  packages: ServicePackageRow[];
  selectedItems: Set<string>;
  selectedPackage: string | null;
  onToggleItem: (code: string) => void;
  onSelectPackage: (code: string | null) => void;
  onRequestQuote: () => void;
  quoteBusy: boolean;
  province?: string;
  notifyState?: Record<string, 'idle' | 'busy' | 'done' | 'error'>;
  onNotify?: (code: string) => void;
};

function formatPriceCell(
  item: CatalogItemRow,
  locale: string,
  t: (key: string, values?: Record<string, string>) => string,
): { text: string; free: boolean } {
  if (item.available === false) return { text: '—', free: false };
  if (item.priceModel === 'fixed' && item.amountCents != null) {
    if (item.amountCents === 0) return { text: t('free'), free: true };
    return { text: formatEuroCents(item.amountCents, locale), free: false };
  }
  if (item.priceModel === 'passthrough') {
    return { text: t('passthrough'), free: false };
  }
  return { text: t('fixed'), free: false };
}

function ServiceRow({
  item,
  locale,
  selected,
  onToggle,
  province,
  notifyState,
  onNotify,
  noteKey,
  deliverKey,
}: {
  item: CatalogItemRow;
  locale: string;
  selected: boolean;
  onToggle: () => void;
  province?: string;
  notifyState?: 'idle' | 'busy' | 'done' | 'error';
  onNotify?: () => void;
  noteKey: string;
  deliverKey: string;
}) {
  const t = useTranslations('pricing');
  const label = catalogLabel(item, locale);
  const price = formatPriceCell(item, locale, t);
  const unavailable = item.available === false;
  const reason = locale.startsWith('it')
    ? item.availabilityReasonIt
    : item.availabilityReasonEn;

  return (
    <li className="py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-6 items-baseline border-b border-line last:border-b-0">
      <div className="min-w-0">
        <div className={`font-semibold ${unavailable ? 'text-muted' : 'text-ink'}`}>{label}</div>
        <p className="text-[13px] text-muted mt-1 max-w-2xl">{t(noteKey)}</p>
        <span className="inline-block mt-2 text-[10.5px] font-medium uppercase tracking-[0.09em] text-pine border border-current rounded-sm px-2 py-1">
          {t(deliverKey)}
        </span>
        {unavailable ? (
          <div className="text-xs text-clay mt-1">{reason ?? t('coverage.unavailable')}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className={`font-mono text-sm tabular-nums ${price.free ? 'text-pine font-medium' : 'text-ink'}`}>
          {price.text}
        </div>
        {unavailable ? (
          <Button
            type="button"
            variant="outline"
            className="text-xs px-4 py-2"
            disabled={!province || notifyState === 'busy' || notifyState === 'done'}
            onClick={onNotify}
          >
            {notifyState === 'done'
              ? t('coverage.notifyDone')
              : notifyState === 'busy'
                ? t('coverage.notifyBusy')
                : t('coverage.notify')}
          </Button>
        ) : (
          <Button
            type="button"
            variant={selected ? 'primary' : 'outline'}
            className="text-xs px-4 py-2"
            onClick={onToggle}
            aria-pressed={selected}
          >
            {selected ? t('quote.inSelection') : t('quote.add')}
          </Button>
        )}
      </div>
    </li>
  );
}

function JourneyBlock({
  journey,
  locale,
  itemsByCode,
  selectedItems,
  onToggleItem,
  province,
  notifyState,
  onNotify,
}: {
  journey: PricingJourney;
  locale: string;
  itemsByCode: Map<string, CatalogItemRow>;
  selectedItems: Set<string>;
  onToggleItem: (code: string) => void;
  province?: string;
  notifyState?: Record<string, 'idle' | 'busy' | 'done' | 'error'>;
  onNotify?: (code: string) => void;
}) {
  const t = useTranslations('pricing.journeys');
  const codes = JOURNEY_ITEM_CODES[journey];
  const journeyItems = codes
    .map((c) => itemsByCode.get(c))
    .filter((i): i is CatalogItemRow => Boolean(i));
  const proposalNote = journey === 'buy' ? journeyItems.find((i) => i.code === 'PROPOSAL_NOTE') : undefined;
  const leadItems =
    journey === 'buy' ? journeyItems.filter((i) => i.code !== 'PROPOSAL_NOTE') : journeyItems;

  const renderRow = (item: CatalogItemRow) => (
    <ServiceRow
      key={`${journey}-${item.code}`}
      item={item}
      locale={locale}
      selected={selectedItems.has(item.code)}
      onToggle={() => onToggleItem(item.code)}
      province={province}
      notifyState={notifyState?.[item.code]}
      onNotify={onNotify ? () => onNotify(item.code) : undefined}
      noteKey={`rows.${item.code}.note`}
      deliverKey={`rows.${item.code}.deliver`}
    />
  );

  return (
    <section aria-labelledby={`journey-${journey}`} className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
        <h2 id={`journey-${journey}`} className="font-display text-2xl font-medium text-ink">
          {t(`${journey}.title`)}
        </h2>
        <p className="text-[13px] text-muted max-w-md">{t(`${journey}.subtitle`)}</p>
      </div>
      <ul className="mt-1">
        {leadItems.map(renderRow)}
        {journey === 'buy' ? (
          <li className="py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-6 items-baseline border-b border-line last:border-b-0">
            <div>
              <div className="font-semibold text-ink">{t('buy.asteTitle')}</div>
              <p className="text-[13px] text-muted mt-1 max-w-2xl">
                {t('buy.asteNote')}{' '}
                <a
                  href="https://legenda.easycasaita.com"
                  className="text-azure underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Easy Legenda
                </a>
                {t('buy.asteNoteAfter')}
              </p>
              <span className="inline-block mt-2 text-[10.5px] font-medium uppercase tracking-[0.09em] text-pine border border-current rounded-sm px-2 py-1">
                {t('buy.asteDeliver')}
              </span>
            </div>
            <div className="font-mono text-sm text-ink">{t('buy.astePrice')}</div>
          </li>
        ) : null}
        {proposalNote ? renderRow(proposalNote) : null}
      </ul>
    </section>
  );
}

export function PricingCatalogSections({
  locale,
  items,
  packages,
  selectedItems,
  selectedPackage,
  onToggleItem,
  onSelectPackage,
  onRequestQuote,
  quoteBusy,
  province,
  notifyState,
  onNotify,
}: Props) {
  const t = useTranslations('pricing');
  const itemsByCode = useMemo(() => new Map(items.map((i) => [i.code, i])), [items]);

  const featuredPackages = useMemo(() => {
    const byCode = new Map(packages.map((p) => [p.code, p]));
    return FEATURED_PACKAGE_CODES.map((c) => byCode.get(c)).filter(
      (p): p is ServicePackageRow => Boolean(p),
    );
  }, [packages]);

  const neverKeys = ['commission', 'findBuyer', 'writeProposal', 'keys', 'people', 'agencyPay'] as const;
  const promiseKeys = ['deliverable', 'noTransaction', 'specialists', 'withdrawal'] as const;
  const pathKeys = ['sell', 'buy', 'agency'] as const;

  return (
    <>
      <header className="border-t-2 border-ink pt-7 mt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-pine">{t('masthead.eyebrow')}</p>
        <h1 className="font-display font-normal text-[clamp(2.2rem,5.2vw,3.5rem)] leading-[1.06] mt-4 tracking-tight">
          {t('masthead.title')}
        </h1>
        <p className="mt-4 text-[1.06rem] text-muted max-w-[40em]">{t('masthead.lede')}</p>
      </header>

      <dl className="mt-10 mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 rounded-md bg-sand px-7 py-6">
        {promiseKeys.map((key) => (
          <div key={key}>
            <dt className="text-[13px] font-semibold leading-snug">{t(`promise.${key}.title`)}</dt>
            <dd className="mt-1 text-[13.5px] text-muted leading-relaxed m-0">{t(`promise.${key}.body`)}</dd>
          </div>
        ))}
      </dl>

      <div className="grid md:grid-cols-3 border-t border-line mb-14">
        {pathKeys.map((key) => (
          <div key={key} className="px-6 py-6 border-b md:border-b-0 md:border-l border-line first:md:border-l-0">
            <h3 className="font-display text-[1.22rem] font-medium mb-2">{t(`paths.${key}.title`)}</h3>
            <p className="text-sm text-muted m-0 mb-2">{t.rich(`paths.${key}.p1`, { b: (chunks) => <b className="text-ink font-semibold">{chunks}</b> })}</p>
            <p className="text-sm text-muted m-0">{t.rich(`paths.${key}.p2`, { b: (chunks) => <b className="text-ink font-semibold">{chunks}</b> })}</p>
          </div>
        ))}
      </div>

      <JourneyBlock
        journey="sell"
        locale={locale}
        itemsByCode={itemsByCode}
        selectedItems={selectedItems}
        onToggleItem={onToggleItem}
        province={province}
        notifyState={notifyState}
        onNotify={onNotify}
      />

      <section className="mt-14 rounded-lg bg-ink text-paper px-8 py-10" aria-labelledby="pricing-never-heading">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-paper">{t('never.kicker')}</p>
        <h2 id="pricing-never-heading" className="font-display font-normal text-[clamp(1.7rem,3.6vw,2.25rem)] leading-tight mt-3 mb-6 max-w-[20em]">
          {t('never.title')}
        </h2>
        <ul className="list-none m-0 p-0 grid sm:grid-cols-2 gap-px bg-white/10">
          {neverKeys.map((key) => (
            <li key={key} className="bg-ink px-5 py-5 text-[0.95rem]">
              {t(`never.${key}.title`)}
              <span className="block text-[12.5px] text-paper/70 mt-1.5 leading-relaxed">
                {t(`never.${key}.body`)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 border-l-[3px] border-clay pl-5 max-w-[44em]">
        <strong className="font-display font-medium text-[1.25rem] block mb-2">{t('oneSide.title')}</strong>
        <p className="m-0 text-[14.5px] text-muted">{t('oneSide.body')}</p>
      </div>

      <JourneyBlock
        journey="buy"
        locale={locale}
        itemsByCode={itemsByCode}
        selectedItems={selectedItems}
        onToggleItem={onToggleItem}
        province={province}
        notifyState={notifyState}
        onNotify={onNotify}
      />

      <section className="mt-14 rounded-lg border border-line bg-paper px-7 py-7" aria-labelledby="pricing-ready-heading">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-pine">{t('readiness.kicker')}</p>
        <h2 id="pricing-ready-heading" className="font-display font-medium text-[1.35rem] mt-3 mb-2">
          {t('readiness.title')}
        </h2>
        <p className="m-0 mb-6 text-[14.5px] text-muted max-w-[46em]">{t('readiness.lede')}</p>
        <ol className="list-none m-0 mb-5 p-0 grid sm:grid-cols-3 gap-6 counter-reset-step">
          {(['issue', 'attach', 'decide'] as const).map((key, i) => (
            <li key={key} className="text-sm leading-relaxed">
              <span className="block font-mono text-xs text-clay border-b border-line pb-1.5 mb-2">{i + 1}</span>
              <b className="block mb-1">{t(`readiness.${key}.title`)}</b>
              <span className="text-muted">{t(`readiness.${key}.body`)}</span>
            </li>
          ))}
        </ol>
        <p className="border-t border-line pt-3.5 text-[13px] text-muted m-0">{t('readiness.footer')}</p>
      </section>

      <JourneyBlock
        journey="rent"
        locale={locale}
        itemsByCode={itemsByCode}
        selectedItems={selectedItems}
        onToggleItem={onToggleItem}
        province={province}
        notifyState={notifyState}
        onNotify={onNotify}
      />

      <section className="mt-14" aria-labelledby="pricing-packages-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-ink pb-2">
          <h2 id="pricing-packages-heading" className="font-display text-2xl font-medium text-ink">
            {t('packages.heading')}
          </h2>
          <p className="text-[13px] text-muted max-w-md">{t('packages.intro')}</p>
        </div>
        {featuredPackages.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {featuredPackages.map((pkg) => {
              const selected = selectedPackage === pkg.code;
              const blocked = pkg.includes.some((code) => itemsByCode.get(code)?.available === false);
              return (
                <article
                  key={pkg.code}
                  className={`rounded-lg border p-5 flex flex-col gap-3 ${selected ? 'border-azure bg-azure/5' : 'border-line bg-paper'}`}
                >
                  <h3 className="font-semibold text-[1.02rem]">{packageLabel(pkg, locale)}</h3>
                  <ul className="m-0 pl-4 text-[13.5px] text-muted leading-relaxed flex-1">
                    {pkg.includes.map((code) => {
                      const item = itemsByCode.get(code);
                      if (!item) return null;
                      return <li key={code}>{catalogLabel(item, locale)}</li>;
                    })}
                  </ul>
                  <div className="font-mono text-[1.35rem] tabular-nums">
                    {pkg.bundleFixedCents != null
                      ? formatEuroCents(pkg.bundleFixedCents, locale)
                      : null}
                    {pkg.code === 'READY_TO_LIST' ? (
                      <span className="ml-2 text-[13px] text-muted">{t('packages.wasReadyToList')}</span>
                    ) : null}
                    {pkg.code === 'READY_TO_SELL' ? (
                      <span className="ml-2 text-[13px] text-muted">{t('packages.wasReadyToSell')}</span>
                    ) : null}
                    {pkg.code === 'RENTING_MADE_SIMPLE' ? (
                      <span className="ml-2 text-[13px] text-muted">{t('packages.wasRenting')}</span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant={selected ? 'primary' : 'outline'}
                    className="w-full"
                    onClick={() => onSelectPackage(selected ? null : pkg.code)}
                    aria-pressed={selected}
                    disabled={blocked}
                  >
                    {selected ? t('packages.selected') : t('packages.select')}
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">{t('packages.empty')}</p>
        )}
      </section>

      <div className="mt-14 grid md:grid-cols-2 gap-10">
        <section>
          <h2 className="font-display font-medium text-[1.3rem] mb-3">{t('verified.title')}</h2>
          <p className="text-[14.5px] text-muted mb-3">{t.rich('verified.lede', { strong: (c) => <strong className="text-ink">{c}</strong> })}</p>
          <ul className="list-none m-0 p-0 text-sm">
            {(['visura', 'catasto', 'energy', 'noScore', 'noBadge'] as const).map((key) => (
              <li
                key={key}
                className={`py-2 pl-7 relative border-b border-line last:border-b-0 before:absolute before:left-0 before:top-2 ${
                  key === 'noScore' || key === 'noBadge'
                    ? 'before:content-["×"] before:text-clay'
                    : 'before:content-["✓"] before:text-pine before:font-bold'
                }`}
              >
                {t(`verified.${key}`)}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-display font-medium text-[1.3rem] mb-3">{t('agency.title')}</h2>
          <p className="text-[14.5px] text-muted mb-3">{t('agency.p1')}</p>
          <p className="text-[14.5px] text-muted mb-3">
            {t.rich('agency.p2', {
              directory: (chunks) => (
                <Link href="/agenzie" className="text-azure underline">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="text-[14.5px] text-muted m-0">
            {t.rich('agency.p3', { strong: (c) => <strong className="text-ink">{c}</strong> })}
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-line bg-sand/30 px-5 py-4">
        <p className="text-sm text-ink flex-1">{t('quote.barHint')}</p>
        <Button
          type="button"
          disabled={quoteBusy || (selectedItems.size === 0 && !selectedPackage)}
          onClick={onRequestQuote}
        >
          {quoteBusy ? t('quote.busy') : t('quote.request')}
        </Button>
      </div>

      <footer className="mt-14 border-t border-line pt-5 text-[12.5px] text-muted leading-relaxed space-y-2">
        <p className="m-0">{t('pageFooter.iva')}</p>
        <p className="m-0">
          {t('pageFooter.entity')}{' '}
          <span className="font-mono text-xs bg-sand text-clay px-1.5 py-0.5 rounded-sm">
            {t('pageFooter.placeholder')}
          </span>
          {t('pageFooter.entityAfter')}
        </p>
        <p className="m-0 font-medium text-ink">{t('pageFooter.enrollment')}</p>
      </footer>
    </>
  );
}
