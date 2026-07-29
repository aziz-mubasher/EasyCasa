import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.types';

/** Only this Keycloak username may use Casafari share import. */
export const CASAFARI_IMPORTER_USERNAMES = ['muba-admin'] as const;

export function isCasafariImporter(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  const uname = (user.preferredUsername ?? '').trim().toLowerCase();
  return (CASAFARI_IMPORTER_USERNAMES as readonly string[]).includes(uname);
}

export function assertCasafariImporter(user: AuthUser): void {
  if (!isCasafariImporter(user)) {
    throw new ForbiddenException(
      'Casafari import is restricted to the muba-admin account',
    );
  }
}
