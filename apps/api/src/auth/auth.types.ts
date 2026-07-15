import type { UserRole } from '@easycasa/shared';

export interface AuthUser {
  sub: string;            // OIDC subject
  email?: string;
  name?: string;
  roles: UserRole[];
}
