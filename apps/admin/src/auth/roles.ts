import {
  adminRolesFromRoles,
  crmRolesFromRoles,
  type AdminRole,
  type CrmRole,
} from '@easycasa/shared';

function realmRolesFromAccessToken(accessToken: string | null): string[] {
  if (!accessToken) return [];
  try {
    const part = accessToken.split('.')[1];
    if (!part) return [];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { realm_access?: { roles?: string[] } };
    return payload.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

/** Decode JWT payload for UI gates only — API still enforces roles. */
export function adminRolesFromAccessToken(accessToken: string | null): AdminRole[] {
  return adminRolesFromRoles(realmRolesFromAccessToken(accessToken));
}

export function crmRolesFromAccessToken(accessToken: string | null): CrmRole[] {
  return crmRolesFromRoles(realmRolesFromAccessToken(accessToken));
}

export function canAccessView(roles: readonly AdminRole[], view: string): boolean {
  if (roles.includes('superadmin')) return true;
  switch (view) {
    case 'crm':
      // CRM nav also shown when any crm-* realm role is present — see App.
      return roles.includes('operations') || roles.includes('support');
    case 'credentials':
    case 'takedown':
    case 'identity':
    case 'vo':
    case 'orchestration':
    case 'compliance':
    case 'rli':
      return roles.includes('operations');
    case 'coverage':
      return roles.includes('operations') || roles.includes('support');
    case 'whatsapp':
      return roles.includes('operations') || roles.includes('support');
    case 'aste':
      return roles.includes('operations') || roles.includes('support');
    case 'dsar':
      return roles.includes('dpo');
    case 'aml':
      return roles.includes('aml');
    default:
      return false;
  }
}

export function canAccessCrmView(
  _adminRoles: readonly AdminRole[],
  crmRoles: readonly CrmRole[],
): boolean {
  // API CrmRoleGuard requires a crm-* realm role — do not show the nav on
  // admin_operations / admin_support alone (that produced a confusing 403).
  return crmRoles.length > 0;
}
