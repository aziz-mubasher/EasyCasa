/**
 * EC-11 — Authority vocabulary (capability ≠ relationship ≠ projection).
 *
 * Capability is the coarse gate only. Relationship and field projection narrow it.
 * See docs/ec-11-authority-model.md.
 */

/** Product capabilities — Keycloak realm roles map into these. */
export type Capability =
  | 'seeker'
  | 'owner'
  | 'professional'
  | 'conductor'
  | 'agency_member'
  | 'admin'
  /** EC-19 — read-only inbound WhatsApp viewer (not granted by bare `admin`). */
  | 'whatsapp:inbound:read'
  /** EC-20 — operator free-form reply inside an open 24h window. */
  | 'whatsapp:inbound:reply';

/** Fine-grained admin personas — never a single omniscient admin. */
export type AdminRole =
  | 'support'
  | 'operations'
  | 'finance'
  | 'dpo'
  | 'aml'
  | 'superadmin';

/** Realm role names that grant AdminRole. Bare `admin` grants capability only — fail closed. */
export const ADMIN_ROLE_REALM: Readonly<Record<string, AdminRole>> = {
  admin_support: 'support',
  admin_operations: 'operations',
  admin_finance: 'finance',
  admin_dpo: 'dpo',
  admin_aml: 'aml',
  admin_superadmin: 'superadmin',
};

/**
 * Map Keycloak / UserRole strings → capabilities.
 * `seeker` is granted to every authenticated principal (registration default).
 */
export function capabilitiesFromRoles(roles: readonly string[]): Capability[] {
  const caps = new Set<Capability>(['seeker']);
  for (const raw of roles) {
    const r = raw.trim().toLowerCase();
    if (!r) continue;
    if (r === 'buyer' || r === 'seeker') caps.add('seeker');
    if (r === 'seller') {
      caps.add('owner');
      caps.add('conductor');
    }
    if (r === 'agent' || r === 'partner' || r === 'pro_marketer') {
      caps.add('agency_member');
      caps.add('conductor');
      // Agency staff may publish (capability); listing.agency membership is relationship.
      caps.add('owner');
    }
    if (r === 'professional') {
      caps.add('professional');
      caps.add('conductor');
    }
    if (r === 'conductor') caps.add('conductor');
    if (r === 'admin' || r.startsWith('admin_')) caps.add('admin');
    // K EC 4.1 — CRM realm roles grant admin capability (portal + /admin/crm).
    if (r.startsWith('crm-')) caps.add('admin');
    // EC-19 / EC-20 — inbound WhatsApp viewer + reply: support / operations / superadmin.
    // Bare `admin` and other admin_* personas do not get these capabilities.
    if (
      r === 'admin_support' ||
      r === 'admin_operations' ||
      r === 'admin_superadmin'
    ) {
      caps.add('whatsapp:inbound:read');
      caps.add('whatsapp:inbound:reply');
    }
  }
  return [...caps];
}

export function adminRolesFromRoles(roles: readonly string[]): AdminRole[] {
  const out = new Set<AdminRole>();
  for (const raw of roles) {
    const r = raw.trim().toLowerCase();
    const mapped = ADMIN_ROLE_REALM[r];
    if (mapped) out.add(mapped);
  }
  // EC-14: bare `admin` is not an AdminRole — absence of admin_* fails closed.
  return [...out];
}
