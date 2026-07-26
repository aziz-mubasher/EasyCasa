'use client';

import { useCallback, useMemo, useState } from 'react';

import type { CatalogItemRow, ServicePackageRow } from '@/lib/api';
import { requestServiceQuote } from '@/lib/api';
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

export function PricingPageView({ locale, items, packages }: Props) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set());
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof requestServiceQuote>> | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

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

  const toggleItem = useCallback((code: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setSelectedPackage(null);
  }, []);

  const selectPackage = useCallback((code: string | null) => {
    setSelectedPackage(code);
    if (code) setSelectedItems(new Set());
  }, []);

  const onRequestQuote = useCallback(async () => {
    const itemList = [...selectedItems];
    if (itemList.length === 0 && !selectedPackage) return;

    setQuoteBusy(true);
    setQuoteError(null);
    try {
      const result = await requestServiceQuote({
        items: itemList.length > 0 ? itemList : undefined,
        packageCode: selectedPackage ?? undefined,
        referenceValueCents: DEFAULT_PROPERTY_VALUE_EUR * 100,
      });
      setQuote(result);
      setQuoteOpen(true);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Quote failed');
    } finally {
      setQuoteBusy(false);
    }
  }, [selectedItems, selectedPackage]);

  return (
    <>
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
      />
      {quoteError ? (
        <p className="mt-4 text-sm text-clay" role="alert">
          {quoteError}
        </p>
      ) : null}
      <PricingQuotePanel
        locale={locale}
        quote={quote}
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        catalogByCode={catalogByCode}
      />
    </>
  );
}
