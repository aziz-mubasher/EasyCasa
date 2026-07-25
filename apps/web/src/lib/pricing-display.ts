import type { CatalogItemRow } from '@/lib/api';
import { IVA_RATE } from '@/lib/pricing-config';

export function grossCentsForCatalogItem(item: CatalogItemRow): number | null {
  if (item.priceModel !== 'fixed' && item.priceModel !== 'passthrough') return null;
  if (item.amountCents == null) return null;
  const net = item.amountCents;
  const iva = item.ivaApplicable ? Math.round(net * IVA_RATE) : 0;
  return net + iva;
}

export function formatEuroCents(cents: number, locale: string, opts?: { maximumFractionDigits?: number }): string {
  const tag = locale === 'en' ? 'en-IE' : locale === 'es' ? 'es-ES' : 'it-IT';
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: opts?.maximumFractionDigits ?? 0,
  }).format(cents / 100);
}

export function catalogLabel(item: { labelEn: string; labelIt: string; labelEs?: string }, locale: string): string {
  if (locale === 'it') return item.labelIt;
  if (locale === 'es') return item.labelEs ?? item.labelEn;
  return item.labelEn;
}

export function packageLabel(pkg: { labelEn: string; labelIt: string; labelEs?: string }, locale: string): string {
  if (locale === 'it') return pkg.labelIt;
  if (locale === 'es') return pkg.labelEs ?? pkg.labelEn;
  return pkg.labelEn;
}

export function quoteLineLabel(
  line: { code: string; labelEn: string; labelIt: string; labelEs?: string },
  locale: string,
  catalogByCode?: Record<string, { labelEn: string; labelIt: string; labelEs?: string }>,
): string {
  if (locale === 'it') return line.labelIt;
  if (locale === 'es') {
    if (line.labelEs) return line.labelEs;
    const fromCatalog = catalogByCode?.[line.code];
    if (fromCatalog) return catalogLabel(fromCatalog, locale);
  }
  if (catalogByCode?.[line.code]) return catalogLabel(catalogByCode[line.code], locale);
  return line.labelEn;
}
