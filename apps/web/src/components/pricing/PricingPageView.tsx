'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ITALIAN_PROVINCES } from '@easycasa/shared';

import type { CatalogItemRow, ServicePackageRow } from '@/lib/api';
import {
  listServiceCatalog,
  logServiceDemand,
  requestServiceQuote,
  type QuoteRequestBody,
} from '@/lib/api';
import { DEFAULT_PROPERTY_VALUE_EUR } from '@/lib/pricing-config';

import { SavingsComparison } from './SavingsComparison';
import {
  PricingCatalogSections,
  bundleGrossFromPackage,
  sumPartsGrossCents,
} from './PricingCatalogSections';
import { PricingQuotePanel } from './PricingQuotePanel';

type Props = {
  locale: string;
  items: CatalogItemRow[];
  packages: ServicePackageRow[];
};

export function PricingPageView({ locale, items: initialItems, packages }: Props) {
  const t = useTranslations('pricing.coverage');
  const [province, setProvince] = useState('');
  const [items, setItems] = useState(initialItems);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set());
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof requestServiceQuote>> | null>(null);
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequestBody | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [notifyState, setNotifyState] = useState<Record<string, 'idle' | 'busy' | 'done' | 'error'>>({});

  useEffect(() => {
    if (!province) {
      setItems(initialItems);
      return;
    }
    let cancelled = false;
    setCatalogBusy(true);
    void listServiceCatalog(province)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .finally(() => {
        if (!cancelled) setCatalogBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [province, initialItems]);

  const catalogByCode = useMemo(
    () => Object.fromEntries(items.map((i) => [i.code, i])),
    [items],
  );

  const itemsByCode = useMemo(() => new Map(items.map((i) => [i.code, i])), [items]);

  const packagePartTotals = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const pkg of packages) {
      out[pkg.code] = sumPartsGrossCents(pkg, itemsByCode);
    }
    return out;
  }, [packages, itemsByCode]);

  const packageBundleTotals = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const pkg of packages) {
      out[pkg.code] = bundleGrossFromPackage(pkg);
    }
    return out;
  }, [packages]);

  const toggleItem = useCallback(
    (code: string) => {
      const row = itemsByCode.get(code);
      if (row && row.available === false) return;
      setSelectedItems((prev) => {
        const next = new Set(prev);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
      });
      setSelectedPackage(null);
    },
    [itemsByCode],
  );

  const selectPackage = useCallback((code: string | null) => {
    setSelectedPackage(code);
    if (code) setSelectedItems(new Set());
  }, []);

  const onNotify = useCallback(
    async (itemCode: string) => {
      if (!province) return;
      setNotifyState((s) => ({ ...s, [itemCode]: 'busy' }));
      try {
        await logServiceDemand({ itemCode, province });
        setNotifyState((s) => ({ ...s, [itemCode]: 'done' }));
      } catch {
        setNotifyState((s) => ({ ...s, [itemCode]: 'error' }));
      }
    },
    [province],
  );

  const onRequestQuote = useCallback(async () => {
    const itemList = [...selectedItems];
    if (itemList.length === 0 && !selectedPackage) return;

    setQuoteBusy(true);
    setQuoteError(null);
    try {
      const body: QuoteRequestBody = {
        items: itemList.length > 0 ? itemList : undefined,
        packageCode: selectedPackage ?? undefined,
        referenceValueCents: DEFAULT_PROPERTY_VALUE_EUR * 100,
        province: province || undefined,
      };
      const result = await requestServiceQuote(body);
      setQuoteRequest(body);
      setQuote(result);
      setQuoteOpen(true);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Quote failed');
    } finally {
      setQuoteBusy(false);
    }
  }, [selectedItems, selectedPackage, province]);

  return (
    <>
      <div className="mt-8 flex flex-col sm:flex-row sm:items-end gap-3 rounded-xl border border-line bg-paper px-5 py-4">
        <label className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-ink">{t('provinceLabel')}</span>
          <span className="block text-xs text-muted mt-0.5">{t('provinceHint')}</span>
          <select
            className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setSelectedItems(new Set());
              setSelectedPackage(null);
              setNotifyState({});
            }}
          >
            <option value="">{t('provincePlaceholder')}</option>
            {ITALIAN_PROVINCES.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} ({p.slug})
              </option>
            ))}
          </select>
        </label>
        {catalogBusy ? <p className="text-xs text-muted pb-2">{t('checking')}</p> : null}
      </div>

      <SavingsComparison locale={locale} catalogByCode={catalogByCode} />
      <PricingCatalogSections
        locale={locale}
        items={items}
        packages={packages}
        selectedItems={selectedItems}
        selectedPackage={selectedPackage}
        onToggleItem={toggleItem}
        onSelectPackage={selectPackage}
        onRequestQuote={() => void onRequestQuote()}
        quoteBusy={quoteBusy}
        packagePartTotals={packagePartTotals}
        packageBundleTotals={packageBundleTotals}
        province={province}
        notifyState={notifyState}
        onNotify={(code) => void onNotify(code)}
      />
      {quoteError ? (
        <p className="mt-4 text-sm text-clay" role="alert">
          {quoteError}
        </p>
      ) : null}
      <PricingQuotePanel
        locale={locale}
        quote={quote}
        quoteRequest={quoteRequest}
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        catalogByCode={catalogByCode}
      />
    </>
  );
}
