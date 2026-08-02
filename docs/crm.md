# K EC 4.1 — Internal CRM

Native CRM inside the EasyCasa admin portal (`apps/admin`) + NestJS module (`apps/api/src/crm`).

## Gate

`CRM_ENABLED=false` by default. Build may merge; **do not** process production personal data for relationship management until counsel clears the informativa + retention line-item in `docs/legal/COUNSEL-REVIEW-PACKAGE.md` **§1.6 question 2a**.

**Controller responsibility (2026-08-02):** MUNDIDA S.r.l. takes full legal responsibility for client personal data in this CRM once lawfully enabled — see `docs/legal/crm-controller-responsibility.md`. That acknowledgment **does not** clear the gate; keep `CRM_ENABLED=false` until counsel returns on 2a.

### Enablement checklist (after counsel clears 2a)

1. Incorporate approved Art. 13 / retention wording (draft seed: `docs/legal/privacy-policy.md` §8) and bump `policyVersion` as counsel directs.
2. Record counsel decision (date + name) under `docs/legal/`.
3. Set `CRM_ENABLED=true` **only** in the target environment `.env` (never commit live secrets or force the repo default to `true` without an explicit ops decision).
4. Confirm `CRM_DORMANT_RETENTION_MONTHS` matches counsel-approved retention.

## Schema

PostgreSQL schema `crm` — migration `migration/sql/0043_crm.sql`. Unified `contacts` + role profiles (`seeker_profiles`, `owner_profiles`, `b4a_referrals`, `partner_profiles`) + `activities`, `tasks`, `audit_log`.

B4A columns on `crm.b4a_referrals` are **only**: `attestation_status`, `band_max_cents`, `attestation_expires_at`, `holder_initials` (+ sweep metadata). Sweep 404 → status `none` (“Nessuna attestazione”).

## API

All under `/admin/crm`, require capability `admin` + a `crm-*` realm role. See `docs/admin-roles.md`.

## Integration — `CRM_HOOKS` (no EventEmitter)

Sanctioned pattern (v1.1). Implementations are fire-safe; callers wrap with `crmFireSafe`.

```ts
interface CrmHooks {
  onEnquiryCreated(e: CrmEnquiryRef): Promise<void>;
  onViewingTransition(v: CrmViewingRef, to: CrmViewingHookStage): Promise<void>;
  onB4aSweepResult(r: CrmB4aSweepRow): Promise<void>;
}
```

Call points:

| Host | Method | Hook |
|---|---|---|
| `EnquiriesService.create` | after emails | `onEnquiryCreated` |
| `ViewingsService.book` | after notify requested | `onViewingTransition(..., 'viewing_requested')` |
| `ViewingsService.transition` CONFIRM | after notify | `onViewingTransition(..., 'viewing_confirmed')` |
| `ViewingsService.transition` COMPLETE | after status | `onViewingTransition(..., 'viewing_done')` |
| `Banks4AllAttestationSweep.runOnce` | after clear/refresh | `onB4aSweepResult` |

Marketing follow-up beyond Art. 6(1)(b) links `crm.contacts.marketing_consent_id` → existing `consent_records` (`purpose='marketing'`, `granted=true`). No new consent table.

## Admin UI

Vite SPA `apps/admin` — CRM nav entry with Dashboard, Contacts, Contact-360, Pipelines, Tasks, Settings. Design reference: `docs/design/EC_CRM_Admin_Prototype_v1.html`.

## Ochre / mono

Estimated bands (`band_max_cents`) render with IBM Plex Mono + `--ochre` (`#C08A1E`). Confirmed figures: mono, ink/paper.
