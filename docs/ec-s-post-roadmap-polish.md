# EC-S Post-Roadmap Polish Backlog

**Status:** Roadmap v2 (T01–T33) COMPLETE as of `main @ b88ec82` / VPS tip `4879928` (2026-08-13).
**This doc:** polish items (PP), ops verifications (V), and parked gates (PK). Nothing here blocks live operation of stages already lit.
**Companion:** journey experience plan → [`docs/ec-s-seller-journey-completion.md`](./ec-s-seller-journey-completion.md) (PP-4/5/6 + V-1).
**Repo home:** `docs/ec-s-post-roadmap-polish.md`
**Live state recap:** ledger claims 1–2 live · seller onboarding **API + web form** + dual inbox on · boost/premium/directory on · **PP-5 monetisation UI live** · **PP-6 VO/checklist UI deployed dark** · **PP-1 partner self-serve checkout shipped** (needs Stripe Price ID backfill) · paid directory MVP (migration 0064/0065) · Claims 7–8 + G1 + G3 row 9 closed · **viewings API on (V-1 2026-08-14)** · **PP-1/2/3/4/5/6 eng closed** · PK-1/PK-2 still parked · **EC-S eng backlog empty** — remaining work is PK decisions only.

---

## A. Polish items — dispatchable on AZM's word (one Kaizen code per item, one agent per code)

_All PP items closed 2026-08-14. Section intentionally empty — no further eng dispatches until a new product brief._

| ID | Item | Scope | Gate | Est. |
|----|------|-------|------|------|
| **PP-4** | **Seller onboarding web form** | Web UI for `POST /seller/onboarding` where wizard raises `onboardingRequired` (name, phone, marketing consent, informativa v1.1). IT/EN/ES. Zero-curl path to publish | **CLOSED 2026-08-14** — PR #150 merged + deployed | done |
| **PP-5** | **Monetisation purchase UI** | Boost 7/30d buy → `/featured/checkout`; premium upsell + portal → `/billing/checkout` + entitlements. T04 wording | **CLOSED 2026-08-14** — PR #152 merged + deployed (K EC 1.48) | done |
| **PP-6** | **VO + checklist seller UI** | Seller VO submit/state + checklist UI behind existing flags (dark until PK-1/PK-2). Follow C.2 if any new `NEXT_PUBLIC_*` | **CLOSED 2026-08-14** — PR #153 merged + deployed dark (K EC 1.49); PK-1/PK-2 to light | done |
| **PP-1** | **Partner Stripe self-serve checkout** | Stripe Price + checkout for partner flat listing fee; replaces admin-marked `paid_placement`; keep UTM/referral strip; labelled sort unchanged | **CLOSED 2026-08-14** — PR #155 merged + deployed (K EC 1.50); AZM must backfill `plans.stripe_price_id` for `partner_directory_placement` before live checkout | done |
| **PP-2** | **Housekeeping bundle** | (a) promote Service JSON-LD helper to `@easycasa/shared`; (b) SEO i18n pass on `valutazione-gratuita` / `acquisto-assistito`; (c) listing titles on enquiry cards | **CLOSED 2026-08-14** — K EC 1.51 | done |
| **PP-3** | **Static lastmod hygiene** | CI fingerprint check on mapped marketing i18n + manual `STATIC_PAGE_LASTMOD` bumps (honest dates, no git-stamp freshness) | **CLOSED 2026-08-14** — folded into K EC 1.51 | done |

**Suggested order:** ~~PP-4~~ → ~~PP-5~~ → ~~PP-6~~ → ~~PP-1~~ → ~~PP-2~~ (+PP-3). **Track complete.**

## A2. Ops verifications

| ID | Item | Result / next |
|----|------|----------------|
| **V-1** | Confirm `SELLER_VIEWINGS_ENABLED` on VPS | **CLOSED 2026-08-14:** flipped **`true`** + api recreate (Traefik pair). Unauth seller viewing APIs → 401; page 200. Authenticated book/confirm smoke = operator follow-up |

## B. Parked gates — need a human decision before any dispatch (DO NOT bundle into other PRs)

| ID | Item | Blocked on | Owner |
|----|------|-----------|-------|
| PK-1 | VO flip (`VERIFIED_OWNER_ENABLED`) → P3 ledger live | Product decision (+ prefer PP-6 UI first) | AZM |
| PK-2 | Checklist flip (`SELLER_CHECKLIST_ENABLED`) → P6 live | Product decision (+ prefer PP-6 UI first) | AZM |
| PK-3 | Analytics flip (`SELLER_ANALYTICS_ENABLED`) → P7 live | Product decision | AZM |
| PK-4 | Bunny CDN (`MEDIA_CDN_ENABLED`) | Bunny DPA signed | AZM / DPO |
| PK-5 | T25 in-portal messaging | T05 §6.5 controllership determination | Counsel |
| PK-6 | T19.2 dup-enforce + suspend UX | LIA | Counsel |
| PK-7 | External counsel countersign — Claim 1 EUR figures, Claim 2 wording, packet PDFs | Counsel engagement (recommended: claims are public on product-owner sign-off only) | AZM → counsel |
| PK-8 | Seed first paid partners (admin marks `paid_placement=true`) | Partner outreach; until then informational banner is correct | AZM |

## C. Standing brief rules (bake into every future EC-S dispatch)

1. **One agent per Kaizen task code.** Never re-issue a code after a bridge timeout — verify via `list_tasks` **and** the public bridge ledger first (T20 duplicate-PR lesson; `task_89efec62` false “no PR” lesson).
2. **Bridge feedback loop (mandatory):** Cursor upserts `docs/azm-deliverables/_bridge/status-ledger.json` at start / PR-open / fail via `node scripts/azm-bridge-status.mjs upsert …` and pastes the `AZM_BRIDGE_STATUS` block in chat. Claude re-polls that ledger (WebFetch raw `main` URL) **before** claiming “still running / no PR”. Runbook: [`docs/runbooks/azm-dev-bridge.md`](./runbooks/azm-dev-bridge.md).
3. **New `NEXT_PUBLIC_*` flag ⇒ same PR adds** `apps/web/Dockerfile` ARG/ENV **and** `infra/docker-compose.yml` `web.build.args`. Runtime `.env` alone does not light Next dark routes.
4. **VPS recreates always use the Traefik pair:** `docker compose -f docker-compose.yml -f docker-compose.traefik.yml …` — single-file recreate 404s public `/api`.
5. **API flags = runtime** (env_file + recreate, image unchanged). **Web `NEXT_PUBLIC_*` = build-time** (`--no-cache` web rebuild).
6. **Merges land via** `git push origin <branch>:main` — `gh` token is read-only for merges.
7. Route naming: `/seller/enquiries` (not `/inbox`). Unauth seller API → 401; flag-off → 404.
8. State explicitly whether a gate item is an **ops flip** or an **eng build**, and whether Stripe checkout is in scope (G3 lesson).
9. Verify live copy in **no-script HTML** — fallback strings persist in the Next messages payload.
10. No CI Lighthouse gating; use documented operator flags (SwiftShader WebGL) for listing pages.
11. Consent version grammar: no suffixes (`v1.1`, not `v1.1-seller`). Enquiry consent purpose key stays `mediation_disclosure` (historical).
12. Ledger/copy changes only via dedicated flip protocol (`promises.json` + dual validators + disclosure reconcile + packet boxes). Never bundle parked flips into copy/legal PRs.
13. Empty paid-partner catalogue ⇒ informational banner is **correct**, not a bug.

## D. Reference docs

| Doc | Purpose |
|-----|---------|
| `docs/ec-s-roadmap.md` | Completed T01–T33 (authoritative, historical) |
| `docs/ec-s-seller-journey-completion.md` | **Self-serve journey plan** (stages + PP-4/5/6 + V-1) |
| `docs/runbooks/seller-dashboard.md` | **SOP — seller dashboard process** (ops/QA) |
| `docs/runbooks/azm-dev-bridge.md` | **Claude↔Cursor status poll / report protocol** |
| `docs/azm-deliverables/_bridge/status-ledger.json` | Public dispatch status Claude WebFetches |
| `docs/audits/EC-S-pp4-k147-completion-feedback.md` | **PP-4 / K EC 1.47** completion R&D feedback |
| `docs/audits/EC-S-pp5-k148-completion-feedback.md` | **PP-5 / K EC 1.48** completion R&D feedback |
| `docs/audits/EC-S-pp6-k149-completion-feedback.md` | **PP-6 / K EC 1.49** completion R&D feedback (UI dark) |
| `docs/audits/EC-S-pp1-k150-completion-feedback.md` | **PP-1 / K EC 1.50** completion R&D feedback (Stripe Price backfill still needed) |
| `docs/audits/EC-S-pp2-k151-completion-feedback.md` | **PP-2+PP-3 / K EC 1.51** completion R&D feedback (eng backlog empty) |
| `docs/audits/EC-S-pr151-bridge-feedback-completion.md` | **azm-dev-bridge feedback loop** (#151) completion R&D feedback |
| `docs/audits/EC-S-azm-bridge-feedback-loop.md` | Bridge loop incident note (superseded by completion feedback above) |
| `docs/azm-deliverables/EC-S-status/EC-S-EXECUTION-STATUS.md` | K EC 1.44 evidence matrix |
| `docs/audits/EC-S-g1-signoff-enablement.md` | G1 record |
| `docs/audits/EC-S-claim12-g3-enablement.md` | Claim 1–2 + G3 record |
| `docs/audits/EC-S-claim12-g3-rnd-report.md` | Claim 1–2 + G3 post-deploy R&D report |
| `docs/audits/EC-S-roadmap-remainings-2026-08-13.md` | Pre-polish remainings (superseded by this doc for open work) |
| `docs/legal/mediation-disclosure.md` | Portal (non-mediazione) framing |
| `docs/legal/ec-s-t02-claims-7-8-addendum.md` | Boost + directory counsel |
| `docs/env.md` | Flag/build-arg documentation |

---
*Maintained by Claude (R&D coordination). PP-1–PP-6 + PP-2/PP-3 closed 2026-08-14. **EC-S eng backlog empty** — section A empty; only PK gates (§B) remain. Update on every PK/V closure.*
