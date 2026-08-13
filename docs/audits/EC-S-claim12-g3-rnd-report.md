# EC-S Claim 1–2 + G3 — R&D status report (for Claude)

**Date:** 2026-08-13 (post merge + deploy)  
**Operator:** Cursor cloud agent  
**Shipped:** `main` @ **`b88ec82`** — PR [#143](https://github.com/aziz-mubasher/EasyCasa/pull/143) MERGED  
**VPS:** `/opt/easycasa-ita` at tip **`4879928`** (includes `b88ec82` + later aste docs). API + web rebuilt/recreated **2026-08-13T19:57Z** with Traefik overlay. Migration `0064` applied (`paid_placement` column live).  
**Enablement record:** `docs/audits/EC-S-claim12-g3-enablement.md`  
**Authoriser:** AZM product-owner (“proceed Claim 1–2 ledger → live; G3 row 9 → paid directory”)

**Parked (explicit, untouched):** VO / checklist / analytics flips · Bunny DPA · T05 §6.5 / T25 · housekeeping bundle.

---

## Operator summary (forwardable)

| Piece | Status | Notes |
| --- | --- | --- |
| Claim 1 `savingsFigures` → live | **DONE + live** | `/it/vendi-da-privato` renders `€7.500–€9.150` in HTML (not messages-only) |
| Claim 2 `mediazioneCopy` → live | **DONE + live** | Portal copy: “Siamo un portale, non un'agenzia…” in HTML |
| Mediation-disclosure reconcile | **DONE** | `docs/legal/mediation-disclosure.md` portal framing; `/it/legal/mediation` shows “opera come portale” / “non svolge mediazione” |
| Interim guard lift | **DONE** | `enforceCounselInterim` no-op in TS + ESM validators |
| G3 row 9 counsel | **SIGNED** | Flat listing fee; IT `Presenza a pagamento`; preferential sort; UTM still stripped |
| Paid directory eng | **MVP DONE** | `paid_placement` column + API/admin + dual labels. Empty catalogue still shows informational banner |
| Partner Stripe self-serve | **NOT DONE** | Admin marks paid after flat fee; Stripe checkout = follow-up |
| Parked flips | **PARKED** | VO / checklist / analytics / CDN / T25 still false |

**Call for R&D:** Claim 1–2 + G3 counsel gates are **closed**. Paid directory is counsel-compliant MVP (labelled + sort), not a full self-serve fee rail. Next eng only if product wants partner Stripe checkout or to unpark VO/analytics/CDN/T25.

---

## Merge + deploy

| Step | Result |
|------|--------|
| PR | [#143](https://github.com/aziz-mubasher/EasyCasa/pull/143) · tip `b88ec82` |
| Land on `main` | Fast-forward `git push origin branch:main` |
| VPS git | Pulled; tip advanced (now `4879928` with unrelated aste docs on top) |
| SQL | `0064_ecs_g3_partner_directory_paid.sql` → `partner_directory.paid_placement boolean NOT NULL DEFAULT false` |
| Rebuild | `docker compose -f docker-compose.yml -f docker-compose.traefik.yml build api web` then `--force-recreate` |
| Health | `/api/health` **200** |

---

## What landed (code / docs)

| Area | Change |
|------|--------|
| Ledger | `apps/web/src/config/sell-privately/promises.json` — both blocks **`live`** |
| Validators | `promiseLedger/index.ts` + `validate-promise-ledger.mjs` — interim no longer rejects live |
| Tests | `promiseLedger.test.ts`, `sell-privately.spec.ts`, `partner-directory-i18n.spec.ts` |
| Disclosure | `docs/legal/mediation-disclosure.md` rewritten; `mediationPage` ours.outro2 IT/EN/ES |
| Packets | T02 Claim 1–2 boxes; T04 Claim 2 flip ☑ + G3 row 9 ☑ |
| G3 schema | `migration/sql/0064_…sql` + Drizzle `paidPlacement` |
| G3 API | Preferential `ORDER BY paid_placement DESC`; `labelKey` switches when any paid |
| G3 web | Banner/badge/ordering note i18n; page reads `labelKey` + `paidPlacement` |
| Remainings | Claim 1–2 + G3 marked done; parked list updated |

---

## Post-deploy smoke (2026-08-13)

| Check | Result |
|-------|--------|
| `/api/health` | **200** |
| `/it/vendi-da-privato` (no-script HTML) | **EUR live** `€7.500–€9.150`; **portal live** “Siamo un portale…” |
| Fallback strings | Only in message bundles / scripts — **not** in rendered body |
| `/it/legal/mediation` | “opera come portale” · “non svolge mediazione” |
| `/api/partners/directory` | **200** `labelKey=partnerDirectory.informationalLabel`, `items=[]` (no paid rows yet → informational banner — expected) |
| `/it/partner-directory` | **200** |
| Parked flags (API env) | `VERIFIED_OWNER_*` / checklist / analytics / `MEDIA_CDN_ENABLED` → **false** |
| Premium / boost / directory flags | Still **true** (prior enablement) |

---

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Implemented Claim 1–2 → `live` exactly as the dedicated flip protocol required (JSON + interim lift + tests + disclosure reconcile).
- Signed G3 row 9 and shipped paid-directory **MVP** (schema/API/UI). Did **not** unpark VO/checklist/analytics/Bunny/T25.
- Fee collection is admin-marked flat fee — not a new Stripe product (called out as follow-up).

### 2. WHERE THE BRIEF FAILED YOU
- **Ambiguous “G3 → paid directory”:** read like Claims 7–8 ops flip. Reality: paid variant was **not built** (only informational directory behind `PARTNER_DIRECTORY_ENABLED`). Had to invent MVP shape.
- **Guess made:** admin `paidPlacement` + labelled preferential sort + keep UTM strip satisfies G3 without conversion tracking or self-serve checkout.
- **Missing:** whether partner Stripe Price / checkout was in scope; assumed out unless asked.
- **Over-specified elsewhere:** Claim 1–2 protocol was clear and usable (promises.json + dual validators + mediation-disclosure).

### 3. REPO REALITY CHECK
- **Stack:** pnpm monorepo · Nest API · Next web · Traefik on VPS `/opt/easycasa-ita`.
- **Claim 1–2** is **web-only** at runtime (ledger + i18n already present); needs web image rebuild.
- **G3** needs SQL **0064** + **api** rebuild (Drizzle schema) + web i18n/page.
- Recreate API/web **must** use both `infra/docker-compose.yml` **and** `infra/docker-compose.traefik.yml` or public `/api` 404s.
- Enquiry consent purpose key stays `mediation_disclosure` (historical); content is portal disclosure.
- Empty paid catalogue correctly keeps **informational** banner until an admin marks a row paid.
- `gh` merge limited — land via `git push origin <branch>:main`.

### 4. EFFORT SIGNAL
- Larger than a flag flip: counsel docs + ledger/tests + disclosure + new migration/API/UI.
- Correct as one combined PR if product wanted both gates closed; could have been split (Claim 1–2 vs G3 eng).
- Deploy wall-clock dominated by `api`+`web` image build (~8 min), not code size.

### 5. BLOCKED / NEEDS A HUMAN
- Optional: create Stripe Price + checkout for partner flat listing fee (self-serve).
- Optional: seed / mark first paid partners in admin so paid banner appears in prod.
- Optional: external counsel countersign on Claim 1 EUR figures / Claim 2 wording.
- Unpark decisions still needed for VO / checklist / analytics / Bunny DPA / T25 / housekeeping.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Do **not** brief “flip paid directory flag” — flag was already on for v1; paid needs schema + labels (now shipped).
- Keep UTM/referral strip unless counsel explicitly wants conversion tracking.
- Do not bundle parked flips into copy/legal PRs.
- When verifying Claim 1–2 live, strip `<script>` before grepping — fallback strings remain in the Next messages payload.
- Partner directory smoke with `items=[]` will show informational label even after G3 — that is correct until `paid_placement=true` rows exist.

---

## Forwardable one-liner

> Claim 1–2 live on production sell-privately (EUR + portal copy); mediation-disclosure reconciled to portal; G3 paid directory MVP live (`paid_placement`, labelled sort, tracking stripped). Parked: VO/checklist/analytics, Bunny, T25. Optional next: partner Stripe checkout + seed paid rows.
