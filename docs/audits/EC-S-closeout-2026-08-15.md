# EC-S close-out verification sweep (2026-08-15)

**Kaizen:** K EC 1.56  
**Repo tip (this sweep):** branch `cursor/ec-s-closeout-k156-c9a3` from `main @ dd9a3c5`  
**Production probes:** VPS Traefik-pair exec + `https://easycasaita.com` HTTP (2026-08-15T19:22Z)

---

## URGENT — Item 1: Verified Owner enablement (VO)

| Signal | Evidence | Result |
|--------|----------|--------|
| Container `VERIFIED_OWNER_ENABLED` | `docker compose … exec -T api printenv VERIFIED_OWNER_ENABLED` on VPS | **`true`** |
| Unauth `GET /api/seller/vo/:id` | `curl` production | **401** (live-unauth, not flag-404) |
| Unauth `POST /api/seller/vo/:id/submit` | `curl` production | **401** (live-unauth) |
| Sell-privately P3 chip | no-script HTML `/it/vendi-da-privato` | **`Attivo`** (`sp-chip--live`) — not `In arrivo` |
| VO submissions in DB | `SELECT count(*) FROM verified_owner_case` | **0 rows** (no cases in any state) |

**Verdict: VO is LIVE.** Routes are gated on (401), container flag is `true`, and the public P3 promise reads **Attivo**.

**AZM decision (2026-08-15) — CLOSED:**

- **Keep VO live.** Named reviewers: **Ibrahim**; **Silvana** (Keycloak role **`admin_superadmin`** → `vo_moderation`).
- SLA: **2 business days**. Queue: `https://admin.easycasaita.com/#vo`.
- Record: `docs/audits/EC-S-vo-staffing-decision.md`.
- Flag/ledger **unchanged** (`VERIFIED_OWNER_ENABLED=true`, P3 Attivo). Submissions still **0** at decision time — first real case will exercise the queue.

---

## Item 2: P7 analytics honesty

**Scope:** real published listings (118 on VPS), not fixtures. Metrics: views/saves/enquiries from `listing_analytics_daily` + live `favorites` / `enquiries` tables. *(No “impressions” column exists in T23 — views are the impression proxy.)*

| Metric | Value | Source |
|--------|-------|--------|
| Published listings | **118** | `listings WHERE status='published'` |
| Listings with any rollup row | **63** | `DISTINCT listing_id` in `listing_analytics_daily` |
| Listings with views > 0 | **26** | join published + rollup |
| Published with zero metrics (views/saves/enquiries/favorites) | **92** (~78%) | anti-join |
| Total views (all rollups) | **738** | `sum(views)` |
| Rollup saves / enquiries columns | **0 / 0** | column sums (saves also tracked via `favorites`) |
| Live favorites on published listings | **0** distinct listings (**2** favorites total in DB) |
| Live enquiries on published listings | **1** listing (**9** enquiries total) |
| Rollup date range | **2026-08-11 → 2026-08-15** | `min(day)` / `max(day)` |
| Top listing views | **521** on `7fe57de8-0dca-4c32-850d-cc18a91ac906` | `sum(views) GROUP BY listing_id` |
| Unauth analytics API | **401** | `GET /api/seller/listings/:id/analytics` |
| P7 sell-privately chip | **Attivo** | no-script HTML |

**Verdict:** P7 is **technically live and recording** for listings with traffic, but **not honest for most sellers today** — **92/118** published listings show empty/near-empty dashboards. Rollups only span **4 days** (table populated post-T23 deploy; no historical backfill). Recommend: (1) seller-facing empty-state copy explaining sparse early data; (2) optional view backfill from access logs if available; **do not** revert P7 ledger in this task unless product chooses — flag unchanged here.

---

## Item 3: Bunny DPA gap — decision packet

See full packet: [`EC-S-pk4-dpa-gap.md`](./EC-S-pk4-dpa-gap.md) (reopened **OPEN**).

**Quantified scope (VPS DB, 2026-08-15):**

| Item | Count / range |
|------|----------------|
| Listing photos on CDN (`easycasa1.b-cdn.net/listings/…`) | **588** `media.url` rows |
| CDN object `created_at` span | **2026-07-24 → 2026-07-29** (URLs already on Pull Zone pre–PK-4 flag flip) |
| Container `MEDIA_CDN_ENABLED` | **`true`** |
| Private VO/checklist on MinIO | unchanged (PK-4 leak check PASS — not re-run this sweep) |
| Bunny purge API wired | **No** — erasure path is DB + MinIO only today |

**DPA existence:** Bunny publishes a **standard account DPA** at `https://dash.bunny.net/account/dpa` (accept + download). **AZM chose Option 1** (2026-08-15) — cite countersigned DPA; CDN stays live. Execution **PENDING** dashboard Accept + citation (`docs/legal/vendors/bunny-dpa-citation.md`). Do **not** treat T05 §4 as ticked until doc id + acceptance date + stored path are filled.

---

## Item 4: Partner directory presentation honesty

**Before:** 7/7 paid rows, all EasyCasa pilot desk (`partner-directory@easycasaita.com`), each labelled “Presenza a pagamento” — reads as inflated third-party inventory.

**Fix chosen:** Per-row **`operatorManaged`** attribute + visible **“Gestito da EasyCasa”** badge (IT/EN/ES), plus page-level **pilot desk note** when all paid rows are operator-managed. **Counsel-approved labels and paid-first sort unchanged.**

| Artifact | Change |
|----------|--------|
| Migration | `migration/sql/0070_ecs_partner_directory_operator_managed.sql` |
| API | `operatorManaged` on public directory JSON |
| Web | Badge + `partner-directory-pilot-note` banner |
| Tests | `partner-directory-i18n.spec.ts`, `partner-directory-presentation.spec.ts` |

---

## Item 5: Board + bridge ledger reconciliation

### EC-S bridge tasks (canonical ledger)

| Kaizen / key | Polish | PR / tip | Lifecycle | Reconciliation flag |
|--------------|--------|----------|-----------|---------------------|
| **K EC 1.47** | PP-4 | [#150](https://github.com/aziz-mubasher/EasyCasa/pull/150) | merged | OK |
| **K EC 1.48** | PP-5 | [#152](https://github.com/aziz-mubasher/EasyCasa/pull/152) | merged | OK |
| **K EC 1.49** | PP-6 | [#153](https://github.com/aziz-mubasher/EasyCasa/pull/153) | merged | OK |
| **K EC 1.50** | PP-1 | [#155](https://github.com/aziz-mubasher/EasyCasa/pull/155) | merged | OK |
| **K EC 1.51** | PP-2+3 | [#157](https://github.com/aziz-mubasher/EasyCasa/pull/157) | merged | OK |
| **K EC 1.52** | PK-2 | [#159](https://github.com/aziz-mubasher/EasyCasa/pull/159) | merged | OK |
| **K EC 1.53** | PK-3 | [#160](https://github.com/aziz-mubasher/EasyCasa/pull/160) | merged | OK |
| **K EC 1.54** ⚠ | PK-1 | [#167](https://github.com/aziz-mubasher/EasyCasa/pull/167) | merged | **Invented code** — agent-assigned, not Claude-dispatched; reconcile or reissue on Kaizen |
| **K EC 1.55** ⚠ | PK-4 | [#169](https://github.com/aziz-mubasher/EasyCasa/pull/169) | merged | **Invented code** — same; DPA still open |
| **PENDING Claude PK-5+6** | PK-5+6 | [#173](https://github.com/aziz-mubasher/EasyCasa/pull/173) | merged | **Needs Kaizen codes** from Claude |
| **PENDING Claude PK-7+8** | PK-7+8 | tip [940145a](https://github.com/aziz-mubasher/EasyCasa/commit/940145a) | merged | **Needs Kaizen codes**; land-before-PR (no PR number) |
| **K EC 7.3** | EC-35/36 | [#158](https://github.com/aziz-mubasher/EasyCasa/pull/158), [#172](https://github.com/aziz-mubasher/EasyCasa/pull/172) | merged | Duplicate Kaizen code on two tasks — board cleanup |
| **K EC 9.1** | EC-27 | [#171](https://github.com/aziz-mubasher/EasyCasa/pull/171) | merged | OK (Aste track) |
| bridge-feedback-loop | — | [#151](https://github.com/aziz-mubasher/EasyCasa/pull/151) | merged | Had `bridgeTaskId: null` — fixed in this PR |

### Proposed Kaizen assignments (Claude confirm → AZM apply)

| Work | Proposed code | Notes |
|------|---------------|-------|
| PK-1 VO enablement | **Keep K EC 1.54** or reissue **K EC 1.57** | If board requires Claude-issued codes only |
| PK-4 Bunny CDN | **Keep K EC 1.55** or reissue **K EC 1.58** | Pair with open DPA packet |
| PK-5 T25 messaging | **K EC 1.59** (suggested) | Replace `PENDING Claude PK-5+6` |
| PK-6 dup-enforce | **K EC 1.60** (suggested) | Same bridge dispatch as PK-5 |
| PK-7 counsel residual | **K EC 1.61** (suggested) | Replace `PENDING Claude PK-7+8` |
| PK-8 seed partners | **K EC 1.62** (suggested) | Same |
| **This close-out** | **K EC 1.56** | Dispatched |

### Ledger fixes in this PR

- `task_pk7_pk8`: `prNumber` populated where land tip known; summary notes DPA/VO open items.
- `task_pk4_cdn`: DPA gap summary corrected to **OPEN** (residual-risk doc superseded by decision packet).
- `bridge-feedback-loop`: `bridgeTaskId` set to `task_bridge_feedback`.
- New entry: **K EC 1.56** close-out sweep.

---

## EC-S closure honesty

| Area | Status |
|------|--------|
| Engineering backlog (PP/PK builds) | **Empty** — code shipped |
| Ops flips PK-1–PK-8 | **Done** on VPS |
| **Bunny DPA (T05 §4)** | **OPEN — Option 1 selected** — CDN live; citation PENDING (`docs/legal/vendors/bunny-dpa-citation.md`) |
| **VO moderation** | **STAFFED / keep live** — reviewers **Ibrahim**; **Silvana** (`admin_superadmin`); **0** submissions at decision |
| **P7 seller experience** | **Partial** — API works; **78%** of published listings have zero metrics |
| **Partner directory** | **Fixed presentation** in this PR; still no genuine third-party paid partner |
| Kaizen board codes | **Stale** — invented 1.54/1.55 + PENDING Claude keys |

**EC-S cannot be called fully closed** until the Bunny DPA citation is filed (Option 1), and Claude assigns real Kaizen codes for PK-5–PK-8. VO staffing fork is **closed** (keep live).

---

*Evidence commands archived in PR description. No feature flags flipped in this sweep.*
