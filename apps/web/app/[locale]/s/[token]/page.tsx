import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { SmartLinkContent } from '@/components/smartlink/SmartLinkContent';
import { fetchSmartLinkPublic, SMARTLINK_VISITOR_COOKIE } from '@/lib/smartlink';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}): Promise<Metadata> {
  const { token, locale } = await params;
  const jar = await cookies();
  const visitor = jar.get(SMARTLINK_VISITOR_COOKIE)?.value ?? null;
  const { data } = await fetchSmartLinkPublic(token, visitor);
  if (!data) {
    return { title: 'Easy Casa Italy' };
  }
  const l = data.listing;
  const pricePart =
    l.price != null
      ? new Intl.NumberFormat(locale, { style: 'currency', currency: l.currency || 'EUR', maximumFractionDigits: 0 }).format(l.price)
      : '';
  const location = [l.city, l.province].filter(Boolean).join(', ');
  const description = [pricePart, location].filter(Boolean).join(' · ');
  const image = l.coverUrl ?? l.media[0]?.url ?? undefined;

  return {
    title: `${l.title} · Easy Casa Italy`,
    description: description || l.title,
    openGraph: {
      title: l.title,
      description: description || l.title,
      type: 'website',
      locale,
      url: `${SITE}/${locale}/s/${token}`,
      images: image ? [{ url: image, alt: l.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: l.title,
      description: description || l.title,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SmartLinkPage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  const { token, locale } = await params;
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SmartLinkContent token={token} locale={locale} />
    </div>
  );
}
