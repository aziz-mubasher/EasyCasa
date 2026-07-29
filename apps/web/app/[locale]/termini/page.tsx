import { redirect } from 'next/navigation';

/** Italian-friendly alias used in contact/terms templates → legal terms. */
export default async function TerminiAlias({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/legal/terms`);
}
