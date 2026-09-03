import type { AdminRole, Capability, CrmRole, UserRole } from '@easycasa/shared';

export interface AuthUser {
  sub: string; // OIDC subject
  email?: string;
  emailVerified?: boolean;
  name?: string;
  /** Keycloak `preferred_username` (e.g. muba-admin). */
  preferredUsername?: string;
  roles: UserRole[];
  /** EC-11 derived capabilities (filled at verify / local-header-auth attach). */
  capabilities?: Capability[];
  /** EC-11 admin personas (filled at verify / local-header-auth attach). */
  adminRoles?: AdminRole[];
  /** K EC 4.1 CRM realm roles (crm-admin / crm-ops / …). */
  crmRoles?: CrmRole[];
}
