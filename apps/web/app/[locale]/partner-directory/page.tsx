import { getTranslations } from 'next-intl/server';

import { PartnerDirectorySelfServe } from '@/components/partner-directory/PartnerDirectorySelfServe';

const API = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://easycasaita.com/api';

type DirItem = {
  id: string;
  category: string;
  name: string;
  province: string;
  credentials: string | null;
  contact: string;
  paidPlacement?: boolean;
};

async function loadDirectory(province?: string, category?: string): Promise<{
  items: DirItem[];
  labelKey: string;
} | null> {
  const qs = new URLSearchParams();
  if (province) qs.set('province', province);
  if (category) qs.set('category', category);
  const url = `${API}/partners/directory${qs.toString() ? `?${qs}` : ''}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (res.status === 404) return null;
    if (!res.ok) return { items: [], labelKey: 'partnerDirectory.informationalLabel' };
    const json = (await res.json()) as { items?: DirItem[]; labelKey?: string };
    return {
      items: json.items ?? [],
      labelKey: json.labelKey ?? 'partnerDirectory.informationalLabel',
    };
  } catch {
    return { items: [], labelKey: 'partnerDirectory.informationalLabel' };
  }
}

export default async function PartnerDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ province?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const t = await getTranslations('partnerDirectory');
  const data = await loadDirectory(sp.province, sp.category);

  if (data == null) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-muted">{t('empty')}</p>
      </main>
    );
  }

  const bannerKey =
    data.labelKey === 'partnerDirectory.paidListingLabel'
      ? 'paidListingLabel'
      : 'informationalLabel';
  const anyPaid = data.items.some((i) => i.paidPlacement === true);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <header className="space-y-2">
        <p
          className="text-sm font-medium text-ink border border-line rounded-sm px-3 py-2 bg-sand/40"
          data-testid="partner-directory-label"
        >
          {t(bannerKey)}
        </p>
        <h1 className="font-display text-3xl font-semibold text-ink">{t('title')}</h1>
        <p className="text-muted text-sm max-w-2xl">{anyPaid ? t('paidLead') : t('lead')}</p>
        {anyPaid ? (
          <p className="text-xs text-muted" data-testid="partner-directory-ordering-note">
            {t('orderingNote')}
          </p>
        ) : null}
        <p className="text-xs text-muted">{t('proMediaNote')}</p>
      </header>

      <PartnerDirectorySelfServe />

      {data.items.length === 0 ? (
        <p className="text-muted">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-line border border-line rounded-sm">
          {data.items.map((item) => {
            const catKey = item.category as 'notaio';
            const catLabel = t.has(`categories.${catKey}`)
              ? t(`categories.${catKey}`)
              : item.category;
            return (
              <li key={item.id} className="p-4 space-y-1">
                <p className="font-medium text-ink">{item.name}</p>
                <p className="text-xs uppercase tracking-wide text-muted">
                  {catLabel} · {item.province}
                  {item.paidPlacement ? (
                    <>
                      {' · '}
                      <span data-testid="partner-paid-badge">{t('paidBadge')}</span>
                    </>
                  ) : null}
                </p>
                {item.credentials ? (
                  <p className="text-sm text-muted">
                    {t('credentials')}: {item.credentials}
                  </p>
                ) : null}
                <p className="text-sm">
                  {t('contact')}:{' '}
                  <span className="break-all" data-testid="partner-contact">
                    {item.contact}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
