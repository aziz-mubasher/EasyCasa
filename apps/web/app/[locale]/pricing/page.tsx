import { getTranslations, getLocale } from 'next-intl/server';

import { listServiceCatalog } from '@/lib/api';

function formatFixed(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : locale === 'es' ? 'es-ES' : 'it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function PricingPage() {
  const t = await getTranslations('pricing');
  const locale = await getLocale();
  const items = await listServiceCatalog();

  return (
    <section className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-4 text-lg text-muted">{t('subtitle')}</p>
      <p className="mt-3 text-sm text-muted border-l-2 border-azure/40 pl-4">{t('disclosure')}</p>

      {items.length === 0 ? (
        <p className="mt-10 text-muted">{t('empty')}</p>
      ) : (
        <ul className="mt-10 divide-y divide-line border-t border-b border-line">
          {items.map((item) => {
            const label = locale === 'it' ? item.labelIt : item.labelEn;
            let price = '';
            if (item.priceModel === 'fixed' && item.amountCents != null) {
              price = formatFixed(item.amountCents, locale);
            } else if (item.priceModel === 'provvigione' && item.ratePercent != null) {
              price = t('provvigione', { rate: (item.ratePercent * 100).toFixed(2) });
            } else if (item.priceModel === 'passthrough') {
              price = t('passthrough');
            } else {
              price = t('fixed');
            }
            return (
              <li key={item.code} className="py-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <div className="font-medium text-ink">{label}</div>
                  <div className="data text-xs text-muted mt-0.5">{item.category}</div>
                </div>
                <div className="data text-sm font-medium text-ink shrink-0">{price}</div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 data text-xs text-muted">{t('iva')}</p>
    </section>
  );
}
