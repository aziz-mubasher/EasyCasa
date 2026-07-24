import { redirect } from 'next/navigation';

/** Deep link: /s/{token} → default locale SmartLink. */
export default async function SmartLinkDeepLink({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/it/s/${token}`);
}
