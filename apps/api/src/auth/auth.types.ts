import type { UserRole } from '@easycasa/shared';

export interface AuthUser {
  sub: string; // OIDC subject
  email?: string;
  name?: string;
  /** Keycloak `preferred_username` (e.g. muba-admin). */
  preferredUsername?: string;
  roles: UserRole[];
}
