# Phase 38 — GDPR + Legal Minimum (before real data)

**Goal:** the legal gate a seeker pilot must clear before a real person's contact
data enters the system. Backend mechanics are built and tested; legal templates
need counsel/DPO sign-off; cookie banner remains a follow-up.

> **Not legal advice.** `docs/legal/*` are drafting templates. A qualified
> Italian/EU data-protection lawyer or your DPO must review before a real seeker
> uses the pilot.

---

## Landed in this repo

```
apps/api/src/privacy/**                 # DSAR, erasure, consent, retention, sources
migration/sql/0020_phase38.sql          # append-only consent_records
docs/legal/privacy-policy.md            # TEMPLATE
docs/legal/mediation-disclosure.md      # TEMPLATE
apps/web/.../ContactEnquiryForm.tsx     # consent checkboxes before enquiry
apps/web/app/[locale]/privacy/          # export / erase UI
apps/web/app/[locale]/legal/**          # short-form policy + mediation pages
```

### Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/me/privacy/export` | Art. 15/20 portable export |
| POST | `/me/privacy/erase` | Art. 17 report (incl. legal holds) |
| POST | `/me/privacy/consents` | Art. 7 append-only ledger |
| GET | `/me/privacy/policy-version` | current `v1-draft` |
| POST | `/admin/privacy/retention-purge` | anonymize stale leads |

No Nest `/api` prefix (Traefik strips it). Subject id = internal user UUID.

### Adaptations vs scaffold

- Drizzle stores + sources (enquiries, viewings, saved searches, profile, consent ledger).
- Enquiry creation calls `assertEnquiryConsents` (403 naming missing purposes).
- Consent ledger retained under legal hold on erase (Art. 7 evidence).
- Converted enquiries (`order_id`) and confirmed viewings retained under hold.
- Daily retention scheduler + `RETENTION_LEAD_DAYS` (default 90).

---

## Validation

```bash
pnpm --filter @easycasa/migration migrate   # 0020_phase38
pnpm --filter @easycasa/api test            # privacy-services + data-subject e2e
```

---

## Still open (pilot go/no-go)

- [ ] `docs/legal/*` approved by counsel/DPO
- [ ] Cookie / non-essential consent banner
- [x] Web PKCE on privacy + Contatta (`apps/web/src/auth/*`)
