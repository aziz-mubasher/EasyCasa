import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '@easycasa/shared';

export const ADMIN_ROLES_KEY = 'authority:admin-roles';

/** Fine-grained admin persona required (in addition to `admin` capability). */
export const RequiresAdminRole = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
