'use client';

import { useTranslations } from 'next-intl';

import { useAuth } from '@/auth/AuthProvider';
import { usePathname } from '@/i18n/routing';

export function AuthControls() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { ready, isAuthenticated, isConfigured, signIn, signOut } = useAuth();

  if (!ready) return null;

  if (!isConfigured) {
    return (
      <span className="text-xs text-muted" title="Set NEXT_PUBLIC_OIDC_* to enable sign-in">
        OIDC
      </span>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        type="button"
        className="hover:text-azure"
        onClick={() => void signOut()}
      >
        {t('signout')}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="hover:text-azure"
      onClick={() => void signIn(pathname || '/')}
    >
      {t('signin')}
    </button>
  );
}

export function SignInPrompt({ message }: { message: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { isConfigured, signIn } = useAuth();

  if (!isConfigured) {
    return <p className="text-sm text-muted">{message}</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{message}</p>
      <button
        type="button"
        className="text-sm underline hover:text-azure"
        onClick={() => void signIn(pathname || '/')}
      >
        {t('signin')}
      </button>
    </div>
  );
}

/** Inline link variant for forms that require auth before submit. */
export function RequireSignInLink() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { isConfigured, isAuthenticated, signIn } = useAuth();

  if (isAuthenticated) return null;
  if (!isConfigured) {
    return <p className="text-sm text-muted">Accedi per continuare (OIDC non configurato).</p>;
  }

  return (
    <p className="text-sm text-muted">
      <button type="button" className="underline hover:text-azure" onClick={() => void signIn(pathname || '/')}>
        {t('signin')}
      </button>{' '}
      per inviare la richiesta.
    </p>
  );
}
