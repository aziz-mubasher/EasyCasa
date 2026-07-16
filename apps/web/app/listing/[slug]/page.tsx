import { redirect } from 'next/navigation';

/** Deep-link / QR entry: /listing/{slug} → localized listing page. */
export default async function ListingDeepLink({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/it/listings/${slug}`);
}
