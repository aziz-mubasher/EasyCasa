'use client';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';

export function Filters({ regions, categories }: {
  regions: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
}) {
  const t = useTranslations('search.filters');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <select className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        defaultValue={params.get('transactionType') ?? ''} onChange={(e) => set('transactionType', e.target.value)}>
        <option value="">{t('all')}</option>
        <option value="sale">{t('sale')}</option>
        <option value="rent">{t('rent')}</option>
      </select>
      <select className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        defaultValue={params.get('categorySlug') ?? ''} onChange={(e) => set('categorySlug', e.target.value)}>
        <option value="">{t('category')}</option>
        {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
      <select className="rounded-lg border border-line bg-paper px-3 py-2 text-sm"
        defaultValue={params.get('regionSlug') ?? ''} onChange={(e) => set('regionSlug', e.target.value)}>
        <option value="">{t('region')}</option>
        {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
      </select>
      <input type="number" placeholder={`${t('price')} max`} defaultValue={params.get('maxPrice') ?? ''}
        onBlur={(e) => set('maxPrice', e.target.value)}
        className="data w-28 rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
      <input type="number" placeholder={t('bedrooms')} defaultValue={params.get('minBedrooms') ?? ''}
        onBlur={(e) => set('minBedrooms', e.target.value)}
        className="data w-24 rounded-lg border border-line bg-paper px-3 py-2 text-sm" />
    </div>
  );
}
