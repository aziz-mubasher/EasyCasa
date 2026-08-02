import { SetMetadata } from '@nestjs/common';
import type { CrmRole } from '@easycasa/shared';

export const CRM_ROLES_KEY = 'crm_roles';

/** Require at least one of the listed CRM realm roles. */
export const RequiresCrmRole = (...roles: CrmRole[]) => SetMetadata(CRM_ROLES_KEY, roles);

export const CRM_WRITE_ROLES: CrmRole[] = ['crm-admin', 'crm-ops', 'crm-conductor'];
export const CRM_READ_ROLES: CrmRole[] = [
  'crm-admin',
  'crm-ops',
  'crm-conductor',
  'crm-marketing',
  'crm-readonly',
];
export const CRM_ADMIN_ONLY: CrmRole[] = ['crm-admin'];
