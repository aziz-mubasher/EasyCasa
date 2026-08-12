# EC-S Private Seller Roadmap — Update Report

**Date:** 2026-08-12  
**Audience:** product / ops / counsel / R&D (Claude)  
**Roadmap:** `docs/ec-s-roadmap.md` (T01–T33)  
**Full audit:** [`docs/azm-deliverables/EC-S-status/EC-S-EXECUTION-STATUS.md`](../azm-deliverables/EC-S-status/EC-S-EXECUTION-STATUS.md) (K EC 1.44)  
**Repo tip:** `efb7131` (`main`) · **API image on VPS:** `57b0f1f` (aste G1; EC-S seller code from T32 deploy tip `86a7b89` still in that lineage)

---

## 1. One-line verdict

**Engineering for Phases 0–4 is on `main` and on the VPS.** Almost everything is still **flag-off**. The track is blocked on **humans** (counsel, G1, G7/DEMO_MODE, Stripe Prices) — not on missing feature code — except T19.2, T25, and T33 Next wiring (T20 web inbox UI landed dark — PR #137).

---

## 2. Scoreboard (T01–T33)

| Status | Count | Meaning |
|--------|------:|---------|
| **DONE** | 25 | Merged on `main` (may be flag-off / counsel-gated) |
| **PARTIAL** | 7 | Code exists; exit criteria not met |
| **NOT STARTED** | 1 | T25 in-portal messaging (controllership HOLD) |

### By phase

| Phase | Scope | Engineering | Live to sellers? |
|-------|--------|-------------|------------------|
| **0** Page + compliance | T01–T05 | Page + ledger live; counsel packets filed | Page yes; savings/mediazione copy still **fallback** |
| **1** Listing & genuineness | T06–T13 | Wizard, OMI, media, publish lifecycle | **No** — `SELLER_ONBOARDING_ENABLED=false` |
| **2** Trust & verification | T14–T19 | VO, checklist, quota, trust chips | **No** — VO / checklist flags **false** |
| **3** Seller dashboard | T20–T25 | Inbox API, viewings, analytics, nudges | **No** — seller feature flags **false**; T20 **web UI missing**; T25 HOLD |
| **4** Monetisation + cross-cut | T26–T33 | Boost, premium, partners, consent UI, i18n, T32 | **No** — monetisation / directory flags **false**; T33 HOLD (G7) |

---

## 3. What shipped recently (last ~48h of EC-S work)

| Item | Ref | Notes |
|------|-----|-------|
| Phase 4 features | PRs [#121](https://github.com/aziz-mubasher/EasyCasa/pull/121)–[#126](https://github.com/aziz-mubasher/EasyCasa/pull/126) | PR-1 nudges, T30 consent ledger, T27 premium, T26 boost, T28/T29 partners, T31 i18n |
| T32 consolidation | [#129](https://github.com/aziz-mubasher/EasyCasa/pull/129) | Consent banner/interstitial; T33 HOLD artifact; Claims 7–8 counsel addendum; flag-matrix tests |
| Migrations on VPS | **0060–0063** | Consent log, seller_subscription, listing_boost, partner_directory |
| Status audit | [#133](https://github.com/aziz-mubasher/EasyCasa/pull/133) → `efb7131` | Report-only matrix + gap inventory |

---

## 4. Production reality (VPS verified 2026-08-12)

| Flag / setting | VPS value | Effect |
|----------------|-----------|--------|
| `NEXT_PUBLIC_DEMO_MODE` | **`true`** | Sitewide `noindex` → T33 SEO category cannot pass |
| `DEMO_MODE` | `false` | API demo path off |
| `SELLER_ONBOARDING_ENABLED` | **`false`** | Seller routes 404 |
| `INFORMATIVA_SELLER_VERSION` | **empty** | Onboarding accept refused even if flag flipped |
| `VERIFIED_OWNER_ENABLED` | `false` | |
| `SELLER_CHECKLIST_ENABLED` | `false` | |
| `SELLER_PREMIUM_ENABLED` | `false` | |
| `LISTING_BOOST_ENABLED` | `false` | |
| `PARTNER_DIRECTORY_ENABLED` | `false` | |
| `MEDIA_CDN_ENABLED` | `false` | Bunny path not live |
| `IMAGE_DUPDETECT_ENFORCE` | `false` | |
| `STRIPE_PRICE_BOOST_7D/30D` | empty | Checkout can use `price_data` fallback; premium still needs Price ID for plan |

Seller inbox / viewings / analytics env keys may be absent from `.env` (code defaults **false**).

---

## 5. Promise ledger (what the public page may claim)

| Promise | Ledger | Status | What’s left to flip `live` |
|---------|--------|--------|----------------------------|
| P1 Zero commission | live | OK (launch claim) | Sustain with T26/T27 after counsel + flags |
| P2 OMI guidance | live | OK | — |
| P3 Verified Owner | **coming** | Code ready | Counsel + `VERIFIED_OWNER_ENABLED` |
| P4 Verified buyers | live | Buyer-side OK | Seller inbox **web UI** still missing |
| P5 Viewings | live | Core OK | Seller-conducted path needs flag + G1 |
| P6 Document checklist | **coming** | Code ready | Counsel + `SELLER_CHECKLIST_ENABLED` |
| P7 Seller analytics | **coming** | Code ready | `SELLER_ANALYTICS_ENABLED` + G3/G4 |
| P8 Control & data | live | Baseline OK | Set `INFORMATIVA_SELLER_VERSION`; T25 still HOLD |

Copy blocks still **fallback:** savings figures (T02), mediazione wording (T04).

---

## 6. Partial / open engineering (not just flags)

| ID | Gap | Owner |
|----|-----|-------|
| **T20** | API + i18n exist; **no seller inbox page** consuming `sellerInbox` | Eng |
| **T33** | Builders + `serializeJsonLd` pre-staged; Next still raw `JSON.stringify`; sitemap/hreflang harden pending | Eng **after G7** |
| **T10** | EXIF/MinIO done; Bunny CDN not enabled | Ops / DPA |
| **T19.2** | Dup-enforce + suspend UX | HOLD until LIA |
| **T25** | In-portal messaging | HOLD until T05 §6.5 controllership |
| **T02/T04/T05** | Packets filed; unsigned | Counsel / DPO |
| **Claims 7–8** | Boost “In evidenza” + partner directory labels | Counsel |

---

## 7. Recommended next actions (ordered)

1. **Ops — G7:** set `NEXT_PUBLIC_DEMO_MODE=false` on VPS → rebuild **web** → unlock T33 SEO work.
2. **Counsel / DPO — G1 path:** sign T02 / T04 / T05; set `INFORMATIVA_SELLER_VERSION` before any seller collection.
3. **Counsel — Claims 7–8:** approve boost + directory labels before flipping those flags.
4. **Eng — T20 web inbox:** small PR to mount inbox UI on existing API + i18n.
5. **Eng — T33 (post-G7):** wire `serializeJsonLd`, CI grep, honest sitemap `lastmod`, Lighthouse SEO ≥95.
6. **Ops — Stripe:** publish Price IDs for boost (optional if `price_data`) and `seller_premium` before premium enablement.
7. **Eng — CI hygiene:** fix `check:seller-hardcoded-strings` / ensure `rg` on CI runners (red CI called out in K EC 1.44 audit).

**Do not:** flip seller/monetisation flags, promise T25 messaging, or start T33 wiring while DEMO_MODE is on.

---

## 8. Document map

| Doc | Use |
|-----|-----|
| This file | Stakeholder update |
| `docs/azm-deliverables/EC-S-status/EC-S-EXECUTION-STATUS.md` | Full T01–T33 evidence matrix |
| `docs/ec-s-roadmap.md` | Authoritative task list |
| `docs/audits/EC-S-phase{0,2,3,4}-completion-feedback.md` | Phase R&D for Claude |
| `docs/audits/EC-S-t32-completion-feedback.md` | T32 |
| `docs/audits/EC-S-t33-hold.md` | T33 dispatch HOLD |
| `docs/legal/ec-s-t02-claims-7-8-addendum.md` | Boost + directory counsel |

---

*Generated 2026-08-12 from K EC 1.44 audit + live VPS `.env` / `/api/version` check.*
