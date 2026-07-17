import { catalogItem, servicePackage } from './catalog';
import {
  IVA_RATE,
  type CatalogItem,
  type Quote,
  type QuoteLine,
  type QuoteRequest,
} from './types';

export class QuoteError extends Error {}

function iva(netCents: number, applicable: boolean): number {
  return applicable ? Math.round(netCents * IVA_RATE) : 0;
}

function lineForItem(item: CatalogItem, referenceValueCents?: number): QuoteLine {
  if (item.priceModel === 'provvigione') {
    const rate = item.ratePercent ?? 0;
    const estNet = referenceValueCents ? Math.round(referenceValueCents * rate) : 0;
    const estIva = iva(estNet, item.ivaApplicable);
    return {
      code: item.code,
      labelEn: item.labelEn,
      labelIt: item.labelIt,
      kind: 'provvigione',
      netCents: estNet,
      ivaCents: estIva,
      grossCents: estNet + estIva,
      estimated: true,
      note: `${(rate * 100).toFixed(2)}% — matures on conclusione dell'affare`,
    };
  }

  const net = item.amountCents ?? 0;
  const ivaC = iva(net, item.ivaApplicable);
  return {
    code: item.code,
    labelEn: item.labelEn,
    labelIt: item.labelIt,
    kind: item.priceModel, // 'fixed' | 'passthrough'
    netCents: net,
    ivaCents: ivaC,
    grossCents: net + ivaC,
    estimated: false,
  };
}

/**
 * Build a transparent quote. Packages replace the fixed-price portion of their
 * included items with a single bundle line; provvigione and pass-through items
 * inside the package are still itemised (a bundle can't pre-charge a % that
 * hasn't matured, nor absorb third-party taxes).
 */
export function buildQuote(req: QuoteRequest): Quote {
  const lines: QuoteLine[] = [];
  const seen = new Set<string>();

  // 1) Package: emit a bundle line for the covered fixed items, plus any
  //    provvigione / passthrough items it contains.
  if (req.packageCode) {
    const pkg = servicePackage(req.packageCode);
    if (!pkg) throw new QuoteError(`Unknown package: ${req.packageCode}`);

    const included = pkg.includes.map((c) => {
      const item = catalogItem(c);
      if (!item) throw new QuoteError(`Package ${pkg.code} references unknown item ${c}`);
      return item;
    });

    if (pkg.bundleFixedCents !== undefined) {
      const net = pkg.bundleFixedCents;
      const ivaC = iva(net, true);
      lines.push({
        code: pkg.code,
        labelEn: `${pkg.labelEn} (package)`,
        labelIt: `${pkg.labelIt} (pacchetto)`,
        kind: 'bundle',
        netCents: net,
        ivaCents: ivaC,
        grossCents: net + ivaC,
        estimated: false,
      });
      // mark fixed items as covered so à la carte doesn't double-charge
      for (const item of included) if (item.priceModel === 'fixed') seen.add(item.code);
    }

    for (const item of included) {
      if (item.priceModel === 'fixed') continue; // covered by bundle
      if (seen.has(item.code)) continue;
      lines.push(lineForItem(item, req.referenceValueCents));
      seen.add(item.code);
    }
  }

  // 2) À la carte items (skip anything already covered by the package).
  for (const code of req.items ?? []) {
    if (seen.has(code)) continue;
    const item = catalogItem(code);
    if (!item) throw new QuoteError(`Unknown catalog item: ${code}`);
    lines.push(lineForItem(item, req.referenceValueCents));
    seen.add(code);
  }

  if (lines.length === 0) throw new QuoteError('Quote is empty: provide items and/or a package');

  // 3) Totals.
  let fixedNet = 0;
  let provvigioneNet = 0;
  let passthrough = 0;
  let ivaTotal = 0;

  for (const l of lines) {
    ivaTotal += l.ivaCents;
    if (l.kind === 'provvigione') provvigioneNet += l.netCents;
    else if (l.kind === 'passthrough') passthrough += l.netCents;
    else fixedNet += l.netCents; // 'fixed' | 'bundle'
  }

  const ivaOnNonProvvigione = lines
    .filter((l) => l.kind !== 'provvigione')
    .reduce((s, l) => s + l.ivaCents, 0);
  const ivaOnProvvigione = ivaTotal - ivaOnNonProvvigione;

  const dueNowGross = fixedNet + passthrough + ivaOnNonProvvigione;
  const estimatedTotalGross = dueNowGross + provvigioneNet + ivaOnProvvigione;

  return {
    lines,
    fixedNetCents: fixedNet,
    provvigioneEstimatedNetCents: provvigioneNet,
    passthroughCents: passthrough,
    ivaCents: ivaTotal,
    dueNowGrossCents: dueNowGross,
    estimatedTotalGrossCents: estimatedTotalGross,
    currency: 'EUR',
  };
}
