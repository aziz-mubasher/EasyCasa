# EC-S Post-Roadmap Polish Backlog

**Status:** Roadmap v2 (T01–T33) COMPLETE as of `main @ b88ec82` / VPS tip `4879928` (2026-08-13).
**This doc:** the only remaining EC-S work — polish items (PP) and parked gates (PK). Nothing here blocks live operation.
**Repo home:** `docs/ec-s-post-roadmap-polish.md`
**Live state recap:** ledger claims 1–2 live · seller onboarding + dual inbox on · boost/premium/directory on · paid directory MVP (migration 0064) · Claims 7–8 + G1 + G3 row 9 closed.

---

## A. Polish items — dispatchable on AZM's word (one Kaizen code per item, one agent per code)

| ID | Item | Scope | Gate | Est. |
|----|------|-------|------|------|
| PP-1 | **Partner Stripe self-serve checkout** | Stripe Price + checkout for partner flat listing fee; replaces admin-marked `paid_placement`; keep UTM/referral strip; labelled sort unchanged | None (G3 row 9 signed) | 1 PR |
| PP-2 | **Housekeeping bundle** | (a) promote Service JSON-LD helper to `@easycasa/shared`; (b) SEO i18n pass on `valutazione-gratuita` / `acquisto-assistito` hardcoded EN strings; (c) listing titles on enquiry cards (API returns UUID only — needs small API field) | None | 1 PR |
| PP-3 | **Static lastmod hygiene** | `STATIC_PAGE_LASTMOD` map is manual — bump on marketing copy changes, or wire to git log date per page | None | trivial |

## B. Parked gates — need a human decision before any dispatch (DO NOT bundle into other PRs)

| ID | Item | Blocked on | Owner |
|----|------|-----------|-------|
| PK-1 | VO flip (`VERIFIED_OWNER_ENABLED`) → P3 ledger live | Product decision (code ready since Phase 2) | AZM |
| PK-2 | Checklist flip (`SELLER_CHECKLIST_ENABLED`) → P6 live | Product decision | AZM |
| PK-3 | Analytics flip (`SELLER_ANALYTICS_ENABLED`) → P7 live | Product decision | AZM |
| PK-4 | Bunny CDN (`MEDIA_CDN_ENABLED`) | Bunny DPA signed | AZM / DPO |
| PK-5 | T25 in-portal messaging | T05 §6.5 controllership determination | Counsel |
| PK-6 | T19.2 dup-enforce + suspend UX | LIA | Counsel |
| PK-7 | External counsel countersign — Claim 1 EUR figures, Claim 2 wording, packet PDFs | Counsel engagement (recommended: claims are public on product-owner sign-off only) | AZM → counsel |
| PK-8 | Seed first paid partners (admin marks `paid_placement=true`) | Partner outreach; until then informational banner is correct | AZM |

## C. Standing brief rules (bake into every future EC-S dispatch)

1. **One agent per Kaizen task code.** Never re-issue a code after a bridge timeout — verify via `list_tasks` first (T20 duplicate-PR lesson).
2. **New `NEXT_PUBLIC_*` flag ⇒ same PR adds** `apps/web/Dockerfile` ARG/ENV **and** `infra/docker-compose.yml` `web.build.args`. Runtime `.env` alone does not light Next dark routes.
3. **VPS recreates always use the Traefik pair:** `docker compose -f docker-compose.yml -f docker-compose.traefik.yml …` — single-file recreate 404s public `/api`.
4. **API flags = runtime** (env_file + recreate, image unchanged). **Web `NEXT_PUBLIC_*` = build-time** (`--no-cache` web rebuild).
5. **Merges land via** `git push origin <branch>:main` — `gh` token is read-only for merges.
6. Route naming: `/seller/enquiries` (not `/inbox`). Unauth seller API → 401; flag-off → 404.
7. State explicitly whether a gate item is an **ops flip** or an **eng build**, and whether Stripe checkout is in scope (G3 lesson).
8. Verify live copy in **no-script HTML** — fallback strings persist in the Next messages payload.
9. No CI Lighthouse gating; use documented operator flags (SwiftShader WebGL) for listing pages.
10. Consent version grammar: no suffixes (`v1.1`, not `v1.1-seller`). Enquiry consent purpose key stays `mediation_disclosure` (historical).
11. Ledger/copy changes only via dedicated flip protocol (`promises.json` + dual validators + disclosure reconcile + packet boxes). Never bundle parked flips into copy/legal PRs.
12. Empty paid-partner catalogue ⇒ informational banner is **correct**, not a bug.

## D. Reference docs

| Doc | Purpose |
|-----|---------|
| `docs/ec-s-roadmap.md` | Completed T01–T33 (authoritative, historical) |
| `docs/runbooks/seller-dashboard.md` | **SOP — seller dashboard process** (ops/QA) |
| `docs/azm-deliverables/EC-S-status/EC-S-EXECUTION-STATUS.md` | K EC 1.44 evidence matrix |
| `docs/audits/EC-S-g1-signoff-enablement.md` | G1 record |
| `docs/audits/EC-S-claim12-g3-enablement.md` | Claim 1–2 + G3 record |
| `docs/audits/EC-S-claim12-g3-rnd-report.md` | Claim 1–2 + G3 post-deploy R&D report |
| `docs/audits/EC-S-roadmap-remainings-2026-08-13.md` | Pre-polish remainings (superseded by this doc for open work) |
| `docs/legal/mediation-disclosure.md` | Portal (non-mediazione) framing |
| `docs/legal/ec-s-t02-claims-7-8-addendum.md` | Boost + directory counsel |
| `docs/env.md` | Flag/build-arg documentation |

---
*Maintained by Claude (R&D coordination). Update on every PP/PK closure; delete when empty.*
