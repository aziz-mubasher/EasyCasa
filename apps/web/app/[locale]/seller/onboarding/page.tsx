'use client';

import { useRouter } from '@/i18n/routing';

import { SellerOnboardingForm } from '@/components/seller/SellerOnboardingForm';

/** EC-S PP-4 — dedicated seller onboarding route (also embedded in listing wizard). */
export default function SellerOnboardingPage() {
  const router = useRouter();
  return (
    <SellerOnboardingForm
      variant="page"
      onComplete={() => {
        router.replace('/seller/list');
      }}
    />
  );
}
