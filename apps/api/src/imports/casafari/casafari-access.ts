import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.types';

/** Only this Keycloak username may use Casafari share import + draft create. */
export const CASAFARI_IMPORTER_USERNAMES = ['muba-seller'] as const;

/** Resolve login name from JWT fields (preferred_username, else email local-part). */
export function casafariImporterIdentity(user: AuthUser | null | undefined): string {
  if (!user) return '';
  const preferred = (user.preferredUsername ?? '').trim().toLowerCase();
  if (preferred) return preferred;
  const email = (user.email ?? '').trim().toLowerCase();
  if (email.includes('@')) return email.split('@')[0] ?? '';
  return email;
}

export function isCasafariImporter(user: AuthUser | null | undefined): boolean {
  const uname = casafariImporterIdentity(user);
  return (CASAFARI_IMPORTER_USERNAMES as readonly string[]).includes(uname);
}

export function assertCasafariImporter(user: AuthUser): void {
  if (!isCasafariImporter(user)) {
    throw new ForbiddenException(
      'Casafari import is restricted to the muba-seller account',
    );
  }
}
