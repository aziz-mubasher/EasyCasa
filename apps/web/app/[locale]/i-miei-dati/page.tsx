import { redirect } from 'next/navigation';

/** Italian-friendly alias used in privacy templates → seeker my-data area. */
export default async function IMieiDatiAlias({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/privacy`);
}
