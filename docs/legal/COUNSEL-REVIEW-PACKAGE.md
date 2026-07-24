# Counsel & DPO Review Package — EasyCasa (Easy Casa Italia)

**Task:** K EC 1.25 — assemble counsel and DPO review package for legal sign-off  
**Prepared:** 2026-07-24  
**Audience:** Qualified Italian lawyer (real-estate mediation + GDPR) and, if appointed, the DPO  
**Status:** Internal engineering documentation — **not legal advice**

---

## How to use this document

This package describes **what the system actually does today**, as inferred from schema, migrations, and application code in this repository. It is intended so counsel can advise efficiently without reading the codebase.

- Wording like “the code stores …” or “the API returns …” is factual system behaviour.
- Nothing here states or implies GDPR “compliance”.
- Where facts are not in the repo, items are marked **UNKNOWN — needs human input**.

**Related draft legal texts (not approved by counsel):**

| Document | Path | Served in production |
| --- | --- | --- |
| Privacy policy template | `docs/legal/privacy-policy.md` | Yes — web route `/it/legal/privacy` shows version **v1-draft** |
| Mediation disclosure template | `docs/legal/mediation-disclosure.md` | Yes — web route `/it/legal/mediation` (linked from Contatta flow) |

**Production context (from product/ops brief, not verified in this PR):** the **Contatta (enquiry) flow is live**, collecting real personal data. Consent records are written with `policyVersion: "v1-draft"`. Counsel must decide whether that is acceptable and what remediation is required.

---

## 1.1 Record of Processing Activities (GDPR Art. 30) — as implemented

The controller identity, DPO contact, and retention periods in `docs/legal/privacy-policy.md` remain **bracketed placeholders**. The tables below reflect **technical reality** from `apps/api/src/db/schema.ts` and related code.

**Legend — legal basis column:** the application **does not persist GDPR Art. 6 legal bases** per processing activity. The enum `legal_basis` on `service_catalog_items` refers to **Italian service figure** (mediazione vs mandato oneroso), not GDPR. Unless noted, legal basis is **not explicit in code — counsel must assign**.

### A. Live seeker / buyer path (production-relevant)

| Activity | Data categories | Source / trigger | Storage | Recipients / disclosure | Retention (as implemented) | Legal basis in code |
| --- | --- | --- | --- | --- | --- | --- |
| **User account (OIDC)** | Email, display name, internal UUID, role; optional phone, avatar, bio; slug `oidc:{sub}` for Keycloak subjects | First authenticated API call: `UsersService.getOrCreate` maps JWT `sub` / email to `users` row | `users` | Listing owners receive seeker contact data via enquiry emails (see below) | Row kept on “erase” with anonymized fields (FK integrity) | **Not explicit** |
| **Keycloak identity** | Credentials, sessions, OIDC claims (email, profile scopes) | Self-hosted Keycloak on VPS (`infra/keycloak/realm-easycasa.json`) | Keycloak DB (Postgres) | API validates JWT via JWKS (`apps/api/src/auth/jwt-verifier.ts`) | **UNKNOWN** (Keycloak realm retention) | **Not explicit** |
| **Privacy + mediation consents** | Purpose, granted flag, policy version, truncated SHA-256 of IP, timestamp | `POST /me/privacy/consents` before enquiry; UI checkboxes in `ContactEnquiryForm.tsx` | Append-only `consent_records` | Not shared externally | Ledger **never deleted** on erasure (Art. 7 evidence — see §1.3) | **Not explicit** (consent mechanism only) |
| **Enquiries (Contatta)** | Listing IDs, seeker user ID, owner/mediator IDs, intent, status, message (≤2000 chars), contact email/phone | `POST /listings/:id/enquiries` after consent gate | `enquiries` | Email to seeker + owner via Brevo/SMTP (`EnquiriesService.sendEnquiryEmails`); in-app notifications to routed users | Unconverted: message/email/phone anonymized after `RETENTION_LEAD_DAYS` (default **90**); converted (`order_id` set): retained | **Not explicit** |
| **Viewings** | Listing, seeker, conductor, slot, status, optional enquiry link | Viewing booking APIs (Phase 29) | `viewings`, `viewing_availability` | **UNKNOWN** email/push templates if enabled | Non-final statuses cancellable on erasure; **CONFIRMED / COMPLETED / NO_SHOW** retained | **Not explicit** |
| **Saved searches & alerts** | Name, JSON criteria (`query`), notify flag, frequency | User saves search | `saved_searches`, `alert_logs` | Alert pipeline may email/push when matches found | Deleted on profile erasure | **Not explicit** |
| **Favourites** | User ↔ listing links | User action | `favorites` | None | Deleted on erasure | **Not explicit** |
| **Devices (push)** | Expo/web push token, platform, locale | Mobile/web registration | `devices` | Push provider if `PUSH_PROVIDER_URL` set | Deleted on erasure | **Not explicit** |
| **In-app notifications** | Type, channel, JSON payload, status | System events | `notifications` | Not included in DSAR export (see gaps) | **Not defined in privacy module** | **Not explicit** |
| **Transactional email** | To, subject, HTML/text bodies (names, listing titles, enquiry text) | Enquiry/viewing flows | Sent via SMTP (`SMTP_URL`, typically Brevo); **last 500 sends** held in **process memory** (`OutboxEmailProvider`) for admin audit | Brevo as processor | In-memory ring buffer only on API instance; Brevo retention **UNKNOWN** | **Not explicit** |
| **Privacy DSAR export** | Aggregated JSON of registered sources | `GET /me/privacy/export` | Ephemeral HTTP response | User only | N/A | **Not explicit** |
| **Privacy erasure** | Anonymization/deletion per source | `POST /me/privacy/erase` | See §1.3 | N/A | N/A | **Not explicit** |

### B. Public / optional auth flows

| Activity | Data categories | Storage | Notes | Legal basis in code |
| --- | --- | --- | --- | --- |
| **Free AVM estimate** | Comune, provincia, geo coordinates, property attributes, estimate JSON; optional `contactEmail`; optional `userId` (see bug note) | `valuation_requests` | Public `POST /avm/estimate` @ 10 req/min; logs lead only if email or user present | **No consent gate** | **Not explicit** |
| **OMI cache** | Aggregated market bands by comune/provincia/type | `omi_quotes` | No direct personal data | N/A |
| **Search / browse** | Query params, IP at edge | Meilisearch index of listing fields; API logs may include request IDs | Map tiles fetched from OpenFreeMap (browser → third party) | **Not explicit** |
| **SmartLink view tracking** | Aggregate view counters on `share_links`; per-visitor **HMAC-SHA256 hashes** in `share_link_visitor_hashes` (no raw IP, no cookie storage server-side); anonymous `ec_sl_vid` cookie set in browser | Public `GET /share/:token` (payload) + `POST /share/:token/view` with visitor token from cookie (`ShareViewRecorder.tsx`) | `share_links`, `share_link_visitor_hashes` | Link owner (agent) sees aggregate stats via `GET /me/share-links` | Visitor hash rows: **engineering default 90 days** then purge (aggregates retained); counsel to confirm | **Not explicit** — DPO review (K EC 1.29) |
| **Listing embeddings** | Listing title/description text | `listings.embedding` via AI service | Default embedder is **hashing** (offline); optional OpenAI if configured | **Not explicit** |

**AVM implementation note:** `AvmController` passes `user?.sub` (OIDC subject string) into `valuation_requests.user_id`, which is a **UUID column** — logged-in leads may store an invalid FK or wrong identifier. Counsel should not rely on user linkage until engineering fixes; treat as **personal data in `contact_email` + subject JSON**.

### C. Owner / transaction / compliance path (mostly not live for seeker pilot; schema exists)

| Activity | Data categories | Tables | Code status | Legal basis in code |
| --- | --- | --- | --- | --- |
| **Properties / fascicolo** | Owner ID, cadastral refs, documents | `properties`, `document_assets` | Upload URLs to MinIO | **Not explicit** |
| **Service orders & mandate** | Fiscal code, pricing, mandate types, signature envelope IDs | `service_orders`, `service_order_lines`, `mandates` | E-sign provider **stubbed** if env empty | **Not explicit** |
| **Assignments / professionals** | Display names, coverage provinces, credentials | `professionals`, `credentials`, `assignments`, `service_tasks` | Operational | **Not explicit** |
| **AML / KYC** | `subject_ref`, risk factors JSON, scores | `kyc_cases` | Screening provider stubbed unless env set | **Not explicit** (Italian AML law expected) |
| **Leases (RLI)** | Rent terms, registration protocol | `leases` | RLI channel stubbed | **Not explicit** |
| **Payments / invoicing** | Amounts, Stripe refs, fattura JSON | `payment_intents`, `invoices` | Stripe optional | **Not explicit** |
| **Memberships / Stripe** | Stripe customer/subscription IDs, VAT ID | `memberships` | Billing optional | **Not explicit** |
| **Messaging** | Conversation participants, message bodies | `conversations`, `messages` | Module exists | **Not explicit** |
| **Partner / leads** | Partner IDs, scores | `leads`, `partner_profiles`, `payouts` | Partner scope | **Not explicit** |

### D. WordPress ETL (legacy catalogue import)

| Activity | Data categories | Mechanism | Consent / notice |
| --- | --- | --- | --- |
| **WP user import** | `wp_user_id`, email, display_name, slug | `migration/src/etl/load.ts` upserts into `users` as role **`agent`** | **No EasyCasa consent** — data copied from legacy WordPress |
| **WP listing import** | Addresses, descriptions, agent linkage, coordinates, media URLs | Upsert by `wp_post_id`; `source = 'wordpress'` | Listings may contain **third-party personal data** in free text (owner phone in description, etc.) — **not systematically scrubbed** |
| **Geocode / media** | Address strings in `geocode_cache`; images | Migration tooling | **Not explicit** |

**WordPress ETL conclusion for counsel:** the ETL **does import personal data of individuals who never consented to EasyCasa** (historical agents/users and possibly third parties embedded in listing text). There is **no** automated re-consent or erasure workflow for migrated rows. Pilot seed/ETL users are distinct from live seeker consents.

### E. Infrastructure processors touching personal data

See §1.4.

---

## 1.2 Consent mechanics — exactly as implemented

### Purposes

Defined in `apps/api/src/privacy/consent.service.ts`:

| Purpose | Required for enquiry? | UI |
| --- | --- | --- |
| `privacy_policy` | Yes | Checkbox linking to `/it/legal/privacy` with live `policyVersion` label |
| `mediation_disclosure` | Yes | Checkbox linking to `/it/legal/mediation` |
| `marketing` | No (type exists; not used in Contatta gate) | — |

### Enquiry gate

- Before creating an enquiry, `EnquiriesService.create` calls `assertEnquiryConsents`.
- If either required purpose lacks a latest ledger record with `granted: true`, API returns **403** with body message: `missing required consent: privacy_policy, mediation_disclosure` (or subset).
- Integration tests: `apps/api/test/integration/enquiry-consent-gate.int.spec.ts`.

### Recording consents

- Endpoint: `POST /me/privacy/consents` (authenticated).
- Body: `{ purpose, granted, policyVersion? }` — if omitted, server uses `CURRENT_POLICY_VERSION` (`v1-draft`).
- Storage: append-only insert into `consent_records` (`migration/sql/0020_phase38.sql`): `subject_user_id`, `purpose`, `granted`, `policy_version`, optional `ip_hash` (first 16 hex chars of SHA-256 of `req.ip`), `created_at`.
- **Withdrawal:** implemented as a **new** ledger row with `granted: false` (no deletion). Latest row wins (`ConsentService.has`).

### Policy version mechanism

- Constant: `CURRENT_POLICY_VERSION = 'v1-draft'` in `consent.service.ts` (also `policy-versions.ts`).
- Public to authenticated clients: `GET /me/privacy/policy-version` → `{ policyVersion: "v1-draft" }`.
- Web legal page displays “Versione v1-draft” (`apps/web/app/[locale]/legal/privacy/page.tsx`).
- Contatta flow fetches policy version before posting consents (`ContactEnquiryForm.tsx`).

**Counsel-critical:** production consent ledger rows reference **`v1-draft`** while `docs/legal/privacy-policy.md` states it is an **unreviewed template**. Art. 7 requires linking consent to the specific policy version shown; counsel must advise on **existing production records** (see §1.6 Q1).

**Note:** both consents store the **same** `policyVersion` string even though mediation disclosure is a separate document — there is **no separate `mediation_disclosure` version** constant in code.

---

## 1.3 Data subject rights — as built

Endpoints (`apps/api/src/privacy/data-subject.controller.ts`):

| Right | Endpoint | Auth |
| --- | --- | --- |
| Access / export | `GET /me/privacy/export` | Bearer OIDC (or DEV_AUTH headers if enabled) |
| Erasure | `POST /me/privacy/erase` | Same |
| Consent | `POST /me/privacy/consents` | Same |

**Identity verification:** the API treats **possession of a valid access token** as sufficient. There is **no** step-up verification, email confirmation loop, or manual DPO review before export/erase.

### Export scope (registered sources only)

`PersonalDataRegistrar` binds:

1. `enquiries` — seeker’s rows  
2. `viewings` — seeker’s rows  
3. `saved_searches`  
4. `profile` — user row + favourites (**not** devices, notifications, messages)  
5. `consent` — full ledger for subject  

**Not exported** though they may hold personal data: `notifications`, `messages`, `conversations`, `valuation_requests`, `devices` (devices deleted on erase but omitted from export), `kyc_cases`, orders/mandates, payment data, email outbox, Keycloak account.

Format: JSON object `{ subjectId, generatedAt, sections[] }` — **not** a standardized portability format (CSV, etc.).

### Erasure behaviour

| Source | Action |
| --- | --- |
| Enquiries (no `order_id`) | Anonymize message, null contact fields |
| Enquiries (converted) | **Retained** — legal hold note |
| Viewings (non CONFIRMED/COMPLETED/NO_SHOW) | Status → `CANCELLED` |
| Viewings (confirmed/completed/no-show) | **Retained** |
| Saved searches | Deleted |
| Profile | Delete favourites & devices; anonymize user email/name/phone/avatar/bio; **user UUID row kept** |
| Consent ledger | **All rows retained** — `erased: 0`, legal hold note |

Response: `{ fullyErased: boolean, outcomes[] }`.

### Retention purge (admin / scheduler)

- Config: `RETENTION_LEAD_DAYS` (default 90) — `apps/api/src/config/load.ts`.
- Daily job: `RetentionScheduler` calls `RetentionService.purgeStaleLeads`.
- Effect: same anonymization as erasure for **unconverted** enquiries older than cutoff (`DrizzleRetentionSink`).
- Manual: `POST /admin/privacy/retention-purge` (admin role).

### Gaps vs GDPR rights (not implemented as APIs)

| Right | Status |
| --- | --- |
| Rectification (Art. 16) | **No dedicated endpoint** — user profile fields not generally editable via privacy API |
| Restriction (Art. 18) | **Not implemented** |
| Objection (Art. 21) | **Not implemented** |
| Portability (Art. 20) | Partial — JSON export only; incomplete data set |
| Complaint info | In draft policy text only |

---

## 1.4 Processors and sub-processors

| Processor | Role | Data exposed | DPA in place? | Location / transfer |
| --- | --- | --- | --- | --- |
| **Hostinger** | VPS hosting (Docker Compose, Postgres, Redis, MinIO, Meilisearch, Traefik) | All application data at rest on VPS | **UNKNOWN** | **UNKNOWN** (EU assumed — confirm contract) |
| **Cloudflare** | DNS / CDN front (docs: DNS-only or WAF — confirm) | IP addresses, HTTP metadata if proxied | **UNKNOWN** | **UNKNOWN** |
| **Keycloak** (self-hosted on same VPS) | Authentication, OIDC tokens | Identity attributes | N/A (controller infrastructure) | Same VPS |
| **Brevo** | SMTP relay (`SMTP_URL` → `smtp-relay.brevo.com`) | Email content, recipient addresses | **UNKNOWN** | **UNKNOWN** (potential non-EU) |
| **OpenFreeMap** (`tiles.openfreemap.org`) | MapLibre vector tiles in browser | Client IP / User-Agent to tile server when map loads | **UNKNOWN** | **UNKNOWN** |
| **Sentry** (`SENTRY_DSN` optional) | API 5xx/error reporting | Stack traces; may include request context/PII if not scrubbed | **UNKNOWN** | **UNKNOWN** |
| **Meilisearch** | Search index | Listing + searchable fields | **UNKNOWN** (self-hosted) | VPS |
| **MinIO / S3** | Media & document objects | Images, uploads | **UNKNOWN** (self-hosted) | VPS |
| **Postgres** | Primary database | All structured PII | N/A | VPS |
| **Redis** | Cache/queues | Possibly session/cache payloads | N/A | VPS |
| **Stripe** | Payments (if enabled) | Billing identifiers | **UNKNOWN** | Likely non-EU SCCs — **confirm** |
| **OpenAI** (optional AI) | Embeddings/chat if `EMBEDDING_PROVIDER=openai` / `CHAT_PROVIDER=openai` | Listing text; user queries if enabled | **UNKNOWN** | **UNKNOWN** |

---

## 1.5 Technical and organisational measures (Art. 32) — what exists in repo

Described as implemented controls, **not** as adequacy conclusions.

### Authentication & authorization

- Production target: **`DEV_AUTH=false`** with OIDC JWT validation (`JwtAuthGuard`, `jose` JWKS).
- Web seeker Contatta + privacy pages use **OIDC PKCE** (`apps/web/src/auth/*`).
- Roles enforced via `RolesGuard` — roles from JWT claim path `OIDC_ROLES_CLAIM` (default `realm_access.roles`): includes `buyer`, `admin`, `agent`, `professional`, etc.
- **Traefik edge** strips spoofable `X-Dev-User`, `X-Dev-Roles`, `X-Dev-Email` before traffic reaches services (`infra/docker-compose.traefik.yml`). With `DEV_AUTH=false`, forged dev headers yield **401** (test: `apps/api/src/auth/auth.e2e.spec.ts`).

### Transport & edge

- TLS termination via Traefik (`websecure`, cert resolver).
- Security headers middleware (HSTS, nosniff, frame deny, referrer policy, permissions policy).
- Public **`/api/metrics`** blocked at edge (403 from internet); Prometheus scrapes internal Docker network.

### Rate limiting

- API default: **120 requests / minute / IP** (`apps/api/src/observability/throttling.ts`).
- Sensitive routes: **10 / minute** — enquiry create (`enquiries.controller.ts`), AVM estimate (`avm.controller.ts`).
- AI route: Traefik ~20/min average + burst (`docker-compose.traefik.yml`).

### Security scanning (CI)

- **gitleaks** full history scan (`.github/workflows/security.yml`, `.gitleaks.toml`).
- **pnpm audit** (critical threshold) + **pip-audit** for AI service.
- **Trivy** container scans (api, web, ai images) — SARIF upload.
- **CodeQL** for JS/TS + Python.

### Known security / resilience weaknesses (must not be hidden)

| Issue | Detail |
| --- | --- |
| **WCAG 2.1 AA** | `.pa11yci.json` targets WCAG2AA; workflow exists but **accessibility gate is reported failing** — EU Accessibility Act exposure for consumer-facing service |
| **Trivy base-image CVEs** | Operational report: **~209** unfixed base-image findings — triage status **UNKNOWN** |
| **CodeQL findings** | Report: **4** findings including HTML attribute handling in `apps/api/src/email/templates/templates.ts` — emails actively sent to real recipients in production |
| **Keycloak bootstrap admin** | `KC_BOOTSTRAP_ADMIN_*` from env; runbook notes **temporary bootstrap** — must be rotated/replaced |
| **Backup-restore drill** | Script `infra/backup-restore-drill.sh` exists; **never proven on live VPS** per ops brief |
| **Encryption at rest** | Postgres/MinIO on VPS — **UNKNOWN** whether disk/volume encryption is enabled |
| **Cookie banner** | **Absent** — no non-essential cookie consent UI in web app |
| **Admin console OIDC** | `admin.easycasaita.com` reported **non-functional** — missing `VITE_OIDC_*` build args in compose |
| **Email outbox PII** | Last 500 emails including enquiry content kept in **API memory** — exposure if heap dumped/compromised |

---

## 1.6 Numbered questions for counsel

1. **v1-draft consents already in production:** what remediation is required for consent records referencing `v1-draft` while legal texts were never approved? Re-consent? Retroactive validation? Data deletion?

2. **Art. 13 informativa:** are the draft `privacy-policy.md` and on-page `/it/legal/privacy` sufficient **at the moment of Contatta**, given checkboxes link to them and version string says “draft”?

3. **Dual consent, single version field:** is it correct that `mediation_disclosure` shares the **privacy** `policyVersion` string with no separate mediation document version?

4. **Lawful basis mapping:** please assign Art. 6 bases for each activity in §1.1 (enquiries, viewings, alerts, AVM leads, ETL legacy data, email, push, AML/KYC when live).

5. **WordPress ETL:** what is the lawful basis for processing imported agent emails/names and third-party PII possibly embedded in listings? Is a **notification campaign**, anonymization, or deletion required?

6. **DPO:** is appointment of a DPO mandatory for EasyCasa’s processing scale and real-estate mediation activities?

7. **AVM public endpoint:** storing `contactEmail` and property location without the enquiry consent gate — which legal basis applies? Is a separate privacy notice/checkbox required?

8. **OpenFreeMap tiles:** is loading third-party map tiles from `tiles.openfreemap.org` a processor relationship requiring DPA and transfer analysis? Does it require cookie/consent banner?

9. **Brevo / Sentry / Stripe / optional OpenAI:** confirm processor agreements, SCCs, and configuration (Sentry scrubbing, email content).

10. **DSAR identity verification:** is Bearer-token-only authentication sufficient for export/erase, or are additional measures required?

11. **Incomplete export / erasure:** counsel guidance on gaps (notifications, messages, valuation requests, Keycloak account deletion, devices omitted from export).

12. **Retention:** is **90-day** anonymization of unconverted enquiries adequate? Are confirmed viewings/enquiries under legal hold aligned with mediation and fiscal retention rules?

13. **Mediation disclosure text:** confirm REA number, fee terms, and consumer disclosures before scaling Contatta nationally.

14. **Controller identity:** provide legal entity name, sede legale, P.IVA, REA for policy footer and Art. 30 register (placeholders in draft policy).

---

## 1.7 Current document status

| Item | Status |
| --- | --- |
| `docs/legal/privacy-policy.md` | **Draft template** — header states not legal advice; bracketed fields unfilled |
| `docs/legal/mediation-disclosure.md` | **Draft template** — REA/fees bracketed |
| Counsel review | **Never completed** |
| Production | Web serves these documents; API policy version **`v1-draft`**; consent ledger stores **`v1-draft`** |
| Cookie policy / banner | **Missing** |
| Register of processing (Art. 30) | **This package** — engineering draft for counsel, not a signed register |

---

## Appendix A — HEADLINE: processing without explicit legal basis in code

**Every production processing activity in §1.1 lacks an explicit GDPR Art. 6 legal basis field in code.** The only “legal basis” enum in the schema is **`service_catalog_items.legal_basis`** (mediation vs paid mandate classification under Italian service law), which is **not** GDPR Art. 6.

Consent gating on enquiries proves **mechanism**, not that counsel agrees consent is the correct basis for all enquiry data.

---

## Appendix B — UNKNOWN list (requires human input)

- Legal entity / controller full details (denominazione, sede, P.IVA, REA, CCIAA)
- Whether a DPO is appointed and contact details
- DPA status and subprocessors: Brevo, Cloudflare, Hostinger, Sentry, Stripe, OpenAI (if used)
- Physical location of VPS and data residency; encryption at rest on Hostinger volumes
- Whether Cloudflare is DNS-only or proxied; CF IP logs retention
- OpenFreeMap operator identity, DPA, and whether IP addresses are processed
- Keycloak admin credential rotation status on production
- Whether `DEV_AUTH=false` and full OIDC are active on production API (intended; confirm in VPS `.env`)
- Sentry DSN configured in production and PII scrubbing rules
- Stripe enabled or not in production
- AI service: `EMBEDDING_PROVIDER` / `CHAT_PROVIDER` values in production
- Backup/restore drill execution history; restic offsite status
- Trivy/CodeQL triage ownership and remediation timeline
- WCAG / EAA remediation plan
- Cookie banner scope (analytics, maps, auth cookies)
- Lawful basis and retention for **all** WordPress-imported personal data
- Orphan users (`email IS NULL`, `slug LIKE 'oidc:%'`) — count and handling
- Whether real users beyond pilot seekers exist in production DB

---

## Appendix C — Personal data flows **not** described in draft privacy policy

The draft seeker-focused policy (`docs/legal/privacy-policy.md` §1) does **not** clearly disclose (non-exhaustive):

- **AVM / valuation_requests** lead capture (email, precise geo, dwelling attributes)
- **In-memory email outbox** retention on API servers
- **OpenFreeMap** (or other map provider) client-side tile requests
- **Sentry** error monitoring (if enabled)
- **WordPress-imported** agent PII and listing-embedded third-party data
- **Devices / push tokens** (Phase 7 mobile)
- **Messaging** module (`conversations`, `messages`) if enabled later
- **AML/KYC, mandates, fiscal code** on owner/transaction path
- **Stripe** billing identifiers
- **AI embeddings** (listing text sent to OpenAI when configured)
- **Admin email-outbox** inspection by admins
- **Keycloak** as separate identity store (policy mentions IdP generically but not retention/subprocessors for Keycloak-as-product)

---

## Appendix D — WordPress ETL and non-consenting individuals

**Yes.** The ETL upserts WordPress users into `users` with email/display name and imports listing content that may contain personal data. **No** consent ledger entries are created for those individuals. They may never have registered on the new EasyCasa OIDC flow. Counsel must advise whether continued publication/process requires a legal basis other than consent and whether outreach or erasure is required.

---

## Appendix E — Key code references (for counsel’s technical advisors)

| Topic | Location |
| --- | --- |
| Schema / tables | `apps/api/src/db/schema.ts`, `migration/sql/*.sql` |
| Consent + DSAR | `apps/api/src/privacy/*` |
| Enquiry gate | `apps/api/src/privacy/enquiry-consent.gate.ts`, `apps/api/src/enquiries/enquiries.service.ts` |
| Contatta UI | `apps/web/src/components/listings/ContactEnquiryForm.tsx` |
| ETL load | `migration/src/etl/load.ts`, `migration/src/etl/transform.ts` |
| Auth | `apps/api/src/auth/jwt.guard.ts`, `infra/docker-compose.traefik.yml` |
| Email templates | `apps/api/src/email/templates/templates.ts` |
| Env vars | `docs/env.md`, `.env.example` |

---

*End of counsel review package.*
