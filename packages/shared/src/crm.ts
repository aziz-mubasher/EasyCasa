/**
 * K EC 4.1 — Internal CRM authority + pipeline vocabulary.
 * Realm roles are distinct from EC-14 admin_* personas.
 */

export type CrmRole =
  | 'crm-admin'
  | 'crm-ops'
  | 'crm-conductor'
  | 'crm-marketing'
  | 'crm-readonly';

/** Keycloak realm role → CrmRole (exact strings). */
export const CRM_ROLE_REALM: Readonly<Record<string, CrmRole>> = {
  'crm-admin': 'crm-admin',
  'crm-ops': 'crm-ops',
  'crm-conductor': 'crm-conductor',
  'crm-marketing': 'crm-marketing',
  'crm-readonly': 'crm-readonly',
};

export function crmRolesFromRoles(roles: readonly string[]): CrmRole[] {
  const out = new Set<CrmRole>();
  for (const raw of roles) {
    const r = raw.trim().toLowerCase();
    const mapped = CRM_ROLE_REALM[r];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

/** Highest-privilege CRM role first (for matrix display / default gate). */
export const CRM_ROLE_RANK: Readonly<Record<CrmRole, number>> = {
  'crm-admin': 50,
  'crm-ops': 40,
  'crm-conductor': 30,
  'crm-marketing': 20,
  'crm-readonly': 10,
};

export type CrmContactSource =
  | 'enquiry'
  | 'manual'
  | 'import'
  | 'b4a_referral'
  | 'partner_intake'
  | 'whatsapp';

export type CrmSeekerStage =
  | 'new_enquiry'
  | 'contacted'
  | 'viewing_requested'
  | 'viewing_confirmed'
  | 'viewing_done'
  | 'outcome_positive'
  | 'outcome_negative'
  | 'dormant';

export type CrmOwnerStage =
  | 'prospect'
  | 'in_conversation'
  | 'onboarding'
  | 'live_listing'
  | 'paused';

export type CrmPartnerStage = 'prospect' | 'vetting' | 'active' | 'inactive';

export type CrmB4aAttestationStatus = 'none' | 'active' | 'expired';

export type CrmPartnerType =
  | 'photographer'
  | 'notary'
  | 'conductor'
  | 'agent'
  | 'other';

export type CrmActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'enquiry_ref'
  | 'viewing_ref'
  | 'stage_change'
  | 'task_done'
  | 'system'
  | 'whatsapp_in';

export type CrmTaskStatus = 'open' | 'done' | 'cancelled';

export type CrmRoleKind = 'seeker' | 'owner' | 'b4a' | 'partner';

export const CRM_SEEKER_STAGES: readonly CrmSeekerStage[] = [
  'new_enquiry',
  'contacted',
  'viewing_requested',
  'viewing_confirmed',
  'viewing_done',
  'outcome_positive',
  'outcome_negative',
  'dormant',
] as const;

export const CRM_OWNER_STAGES: readonly CrmOwnerStage[] = [
  'prospect',
  'in_conversation',
  'onboarding',
  'live_listing',
  'paused',
] as const;

export const CRM_PARTNER_STAGES: readonly CrmPartnerStage[] = [
  'prospect',
  'vetting',
  'active',
  'inactive',
] as const;

/** Derived B4A pipeline (read-only in UI). */
export const CRM_B4A_STAGES = ['referred', 'attestation_active', 'attestation_expired'] as const;
export type CrmB4aStage = (typeof CRM_B4A_STAGES)[number];

/** Default dormant-seeker anonymisation window (months). Counsel to confirm. */
export const CRM_DORMANT_RETENTION_MONTHS_DEFAULT = 24;

export function canCrmWrite(roles: readonly CrmRole[]): boolean {
  return roles.some((r) => r === 'crm-admin' || r === 'crm-ops' || r === 'crm-conductor');
}

export function canCrmExportOrErase(roles: readonly CrmRole[]): boolean {
  return roles.includes('crm-admin');
}

export function isCrmMarketing(roles: readonly CrmRole[]): boolean {
  return roles.includes('crm-marketing') && !roles.some((r) => r === 'crm-admin' || r === 'crm-ops');
}

export function crmB4aStageFromStatus(status: CrmB4aAttestationStatus): CrmB4aStage {
  if (status === 'active') return 'attestation_active';
  if (status === 'expired') return 'attestation_expired';
  return 'referred';
}
