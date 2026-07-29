import { applyDecorators, SetMetadata } from '@nestjs/common';
import { capabilitiesFromRoles, type UserRole } from '@easycasa/shared';

import { CAPABILITIES_KEY } from './capability.decorator';

export const ROLES_KEY = 'roles';

/**
 * Legacy role gate — also stamps EC-11 capabilities derived from the roles
 * so {@link CapabilityGuard} sees the route as declared.
 */
export const Roles = (...roles: UserRole[]) => {
  const caps = capabilitiesFromRoles(roles);
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    SetMetadata(CAPABILITIES_KEY, caps),
  );
};
