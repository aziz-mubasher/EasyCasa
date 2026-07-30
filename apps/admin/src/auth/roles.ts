import { adminRolesFromRoles, type AdminRole } from '@easycasa/shared';

/** Decode JWT payload for UI gates only — API still enforces roles. */
export function adminRolesFromAccessToken(accessToken: string | null): AdminRole[] {
  if (!accessToken) return [];
  try {
    const part = accessToken.split('.')[1];
    if (!part) return [];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { realm_access?: { roles?: string[] } };
    const roles = payload.realm_access?.roles ?? [];
    return adminRolesFromRoles(roles);
  } catch {
    return [];
  }
}

export function canAccessView(roles: readonly AdminRole[], view: string): boolean {
  if (roles.includes('superadmin')) return true;
  switch (view) {
    case 'credentials':
    case 'takedown':
    case 'identity':
    case 'orchestration':
    case 'compliance':
    case 'rli':
      return roles.includes('operations');
    case 'coverage':
      return roles.includes('operations') || roles.includes('support');
    case 'dsar':
      return roles.includes('dpo');
    case 'aml':
      return roles.includes('aml');
    default:
      return false;
  }
}
