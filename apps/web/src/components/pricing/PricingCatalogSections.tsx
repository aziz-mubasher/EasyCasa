'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import type { CatalogItemRow, ServicePackageRow } from '@/lib/api';
import {
  FEATURED_PACKAGE_CODES,
  JOURNEY_ITEM_CODES,
  type PricingJourney,
} from '@/lib/pricing-config';
import { catalogLabel, formatEuroCents, grossCentsForCatalogItem, packageLabel } from '@/lib/pricing-display';
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
): string {
  if (item.available === false) return '—';
  if (item.priceModel === 'fixed' && item.amountCents != null) {
    return formatEuroCents(item.amountCents, locale);
  }
  if (item.priceModel === 'provvigione' && item.ratePercent != null) {
    return t('provvigione', { rate: (item.ratePercent * 100).toFixed(2) });
  }
  if (item.priceModel === 'passthrough') {
    return t('passthrough');
  }
  return t('fixed');
}

function ServiceRow({
  item,
  locale,
  selected,
  onToggle,
  province,
  notifyState,
  onNotify,
}: {
  item: CatalogItemRow;
  locale: string;
  selected: boolean;
  onToggle: () => void;
  province?: string;
  notifyState?: 'idle' | 'busy' | 'done' | 'error';
  onNotify?: () => void;
}) {
  const t = useTranslations('pricing');
  const label = catalogLabel(item, locale);
  const price = formatPriceCell(item, locale, t);
  const unavailable = item.available === false;
  const reason = locale.startsWith('it')
    ? item.availabilityReasonIt
    : item.availabilityReasonEn;

  return (
    <li className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line last:border-b-0">
      <div className="min-w-0">
        <div className={`font-medium ${unavailable ? 'text-muted' : 'text-ink'}`}>{label}</div>
        {unavailable ? (
          <div className="text-xs text-clay mt-1">{reason ?? t('coverage.unavailable')}</div>
        ) : item.ivaApplicable && item.priceModel === 'fixed' ? (
          <div className="text-xs text-muted mt-0.5">{t('ivaExcluded')}</div>
        ) : null}
        {item.capacityConstrained && !unavailable ? (
          <div className="text-xs text-muted mt-1">{t('coverage.capacityNote')}</div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="data text-sm font-medium text-ink">{price}</div>
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
  const journeyItems = codes.map((c) => itemsByCode.get(c)).filter((i): i is CatalogItemRow => Boolean(i));

  if (journeyItems.length === 0) return null;

  return (
    <section aria-labelledby={`journey-${journey}`} className="mt-12">
      <h2 id={`journey-${journey}`} className="font-display text-2xl font-semibold text-ink">
        {t(`${journey}.title`)}
      </h2>
      <p className="mt-2 text-sm text-muted max-w-2xl">{t(`${journey}.subtitle`)}</p>
      <ul className="mt-6 divide-y divide-line border-t border-line">
        {journeyItems.map((item) => (
          <ServiceRow
            key={`${journey}-${item.code}`}
            item={item}
            locale={locale}
            selected={selectedItems.has(item.code)}
            onToggle={() => onToggleItem(item.code)}
            province={province}
            notifyState={notifyState?.[item.code]}
            onNotify={onNotify ? () => onNotify(item.code) : undefined}
          />
        ))}
      </ul>
    </section>
  );
}

function PackageCard({
  pkg,
  locale,
  catalogByCode,
  partsGrossCents,
  bundleGrossCents,
  selected,
  onSelect,
}: {
  pkg: ServicePackageRow;
  locale: string;
  catalogByCode: Map<string, CatalogItemRow>;
  partsGrossCents: number | null;
  bundleGrossCents: number | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations('pricing.packages');
  const tCov = useTranslations('pricing.coverage');
  const label = packageLabel(pkg, locale);
  const saving =
    partsGrossCents != null && bundleGrossCents != null
      ? Math.max(0, partsGrossCents - bundleGrossCents)
      : null;
  const blocked = pkg.includes.some((code) => catalogByCode.get(code)?.available === false);

  return (
    <article
      className={`rounded-xl border p-5 flex flex-col ${selected ? 'border-azure bg-azure/5' : 'border-line bg-paper'} ${blocked ? 'opacity-70' : ''}`}
    >
      <h3 className="font-display text-lg font-semibold text-ink">{label}</h3>
      <ul className="mt-3 text-sm text-muted space-y-1 flex-1">
        {pkg.includes.map((code) => {
          const item = catalogByCode.get(code);
          if (!item) return null;
          return <li key={code}>{catalogLabel(item, locale)}</li>;
        })}
      </ul>
      <div className="mt-4 space-y-1">
        {blocked ? (
          <p className="text-sm text-clay">{tCov('unavailable')}</p>
        ) : null}
        {!blocked && bundleGrossCents != null ? (
          <p className="data text-2xl font-semibold text-ink">{formatEuroCents(bundleGrossCents, locale)}</p>
        ) : null}
        {!blocked && partsGrossCents != null ? (
          <p className="text-xs text-muted">
            {t('partsTotal', { amount: formatEuroCents(partsGrossCents, locale) })}
          </p>
        ) : null}
        {!blocked && saving != null && saving > 0 ? (
          <p className="text-sm text-pine data font-medium">
            {t('saving', { amount: formatEuroCents(saving, locale) })}
          </p>
        ) : null}
        <p className="text-xs text-muted">{t('provvigioneNote')}</p>
      </div>
      <Button
        type="button"
        variant={selected ? 'primary' : 'outline'}
        className="mt-4 w-full"
        onClick={onSelect}
        aria-pressed={selected}
        disabled={blocked}
      >
        {selected ? t('selected') : t('select')}
      </Button>
    </article>
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
  packagePartTotals,
  packageBundleTotals,
  province,
  notifyState,
  onNotify,
}: Props & {
  packagePartTotals: Record<string, number | null>;
  packageBundleTotals: Record<string, number | null>;
}) {
  const t = useTranslations('pricing');
  const [showAll, setShowAll] = useState(false);

  const itemsByCode = useMemo(() => new Map(items.map((i) => [i.code, i])), [items]);

  const featuredPackages = useMemo(() => {
    const byCode = new Map(packages.map((p) => [p.code, p]));
    return FEATURED_PACKAGE_CODES.map((c) => byCode.get(c)).filter((p): p is ServicePackageRow => Boolean(p));
  }, [packages]);

  return (
    <>
      {featuredPackages.length > 0 ? (
        <section className="mt-14" aria-labelledby="pricing-packages-heading">
          <h2 id="pricing-packages-heading" className="font-display text-2xl font-semibold text-ink">
            {t('packages.heading')}
          </h2>
          <p className="mt-2 text-sm text-muted max-w-2xl">{t('packages.intro')}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {featuredPackages.map((pkg) => (
              <PackageCard
                key={pkg.code}
                pkg={pkg}
                locale={locale}
                catalogByCode={itemsByCode}
                partsGrossCents={packagePartTotals[pkg.code] ?? null}
                bundleGrossCents={packageBundleTotals[pkg.code] ?? null}
                selected={selectedPackage === pkg.code}
                onSelect={() =>
                  onSelectPackage(selectedPackage === pkg.code ? null : pkg.code)
                }
              />
            ))}
          </div>
        </section>
      ) : (
        <p className="mt-14 text-sm text-muted">{t('packages.empty')}</p>
      )}

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

      <section className="mt-12">
        <button
          type="button"
          className="text-sm font-medium text-azure hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure rounded"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? t('allServices.hide') : t('allServices.show')}
        </button>
        {showAll ? (
          <ul className="mt-4 divide-y divide-line border-t border-b border-line">
            {items.map((item) => (
              <ServiceRow
                key={item.code}
                item={item}
                locale={locale}
                selected={selectedItems.has(item.code)}
                onToggle={() => onToggleItem(item.code)}
                province={province}
                notifyState={notifyState?.[item.code]}
                onNotify={onNotify ? () => onNotify(item.code) : undefined}
              />
            ))}
          </ul>
        ) : null}
      </section>

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

      <p className="mt-6 text-sm text-muted">
        {t('mediationLinkBefore')}{' '}
        <Link href="/legal/mediation" className="text-azure underline">
          {t('mediationLink')}
        </Link>
      </p>
    </>
  );
}

export function sumPartsGrossCents(pkg: ServicePackageRow, catalogByCode: Map<string, CatalogItemRow>): number {
  let total = 0;
  for (const code of pkg.includes) {
    const item = catalogByCode.get(code);
    if (!item || item.priceModel !== 'fixed') continue;
    const gross = grossCentsForCatalogItem(item);
    if (gross != null) total += gross;
  }
  return total;
}

export function bundleGrossFromPackage(pkg: ServicePackageRow): number | null {
  if (pkg.bundleFixedCents == null) return null;
  const net = pkg.bundleFixedCents;
  return net + Math.round(net * 0.22);
}
