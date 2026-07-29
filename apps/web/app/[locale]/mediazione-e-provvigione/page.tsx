import { redirect } from 'next/navigation';

/** Alias used in design templates → /legal/mediation */
export default async function MediazioneAlias({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/legal/mediation`);
}
