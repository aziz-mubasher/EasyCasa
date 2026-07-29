import { SetMetadata, applyDecorators } from '@nestjs/common';
import type { Capability } from '@easycasa/shared';

export const CAPABILITIES_KEY = 'authority:capabilities';

/** Coarse capability gate — may this principal attempt this *kind* of action? */
export const RequiresCapability = (...capabilities: Capability[]) =>
  SetMetadata(CAPABILITIES_KEY, capabilities);

/**
 * Authenticated principal required; no specific capability.
 * Use for self-scoped `/me/*` routes that only need login.
 */
export const REQUIRES_AUTH_KEY = 'authority:requires-auth';
export const RequiresAuth = () => SetMetadata(REQUIRES_AUTH_KEY, true);

/** Mark a handler as deliberately capability-declared via legacy @Roles (set by Roles). */
export function withCapabilities(...capabilities: Capability[]) {
  return applyDecorators(RequiresCapability(...capabilities));
}
