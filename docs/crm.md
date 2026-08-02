# K EC 4.1 — Internal CRM

Native CRM inside the EasyCasa admin portal (`apps/admin`) + NestJS module (`apps/api/src/crm`).

## Gate

**Consent applied 2026-08-02** (MUNDIDA S.r.l., controller) for Art. 13 informativa + retention — see `docs/legal/crm-controller-responsibility.md` and `COUNSEL-REVIEW-PACKAGE.md` §1.6 Q2a.

- Code / `.env.example` default remains **`CRM_ENABLED=false`** (safe for local, CI, demo).
- **Production may set `CRM_ENABLED=true`** with `CRM_DORMANT_RETENTION_MONTHS=24`.

### Enablement checklist

1. [x] Controller responsibility + consent applied (`docs/legal/crm-controller-responsibility.md`).
2. [ ] Ops: set `CRM_ENABLED=true` in the production VPS `.env` (do not commit secrets).
3. [ ] When counsel returns final §8 copy: bump `policyVersion` as directed.

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
