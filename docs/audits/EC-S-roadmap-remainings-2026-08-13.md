# EC-S Private Seller — remaining work to close the roadmap

**Date:** 2026-08-13  
**Repo tip:** Stripe/premium enablement on `cursor/ecs-stripe-premium-6d4e` · **API:** recreated with Traefik overlay  
**VPS verified:** demo off · informativa `v1.1` · onboarding + dual inbox **true** · boost + directory **true** · **`SELLER_PREMIUM_ENABLED=true`** · `plans.seller_premium.stripe_price_id` set · boost Price IDs set  
**Smoke:** `/api/billing/plans` has seller_premium Price ID; `/api/seller/entitlements` **401** (not flag-404)

Engineering for **T01–T33** is on `main` (T25 messaging HOLD). **G7 + T33 + G1 + Claims 7–8 + Stripe/premium done.** Remaining: optional ledger Claim 1–2 `live` flip, HOLDs.

Completion feedback: `docs/audits/EC-S-stripe-premium-completion-feedback.md` · `docs/audits/EC-S-claims-7-8-completion-feedback.md` · `docs/audits/EC-S-g1-completion-feedback.md` · `docs/audits/EC-S-t33-completion-feedback.md`.

---

## Ordered unblock sequence

```
G7 ✅ ──► T33 ✅
G1 ✅ (T02/T04/T05 signed · INFORMATIVA=v1.1 · onboarding + dual inbox ON)
Claims 7–8 ✅ → LISTING_BOOST + PARTNER_DIRECTORY ON
Stripe Prices ✅ → SELLER_PREMIUM_ENABLED ON (+ boost Price IDs)
Optional: savingsFigures / mediazioneCopy → live (dedicated PR — decision gate)
```

Do **not** flip monetisation / VO / analytics flags before the matching gate.

---

## 1. G7 — unset demo mode → unlock T33 ✅ DONE

| | |
|---|---|
| **Owner** | Ops |
| **Action** | On VPS `/opt/easycasa-ita/.env`: set `NEXT_PUBLIC_DEMO_MODE=false`. Rebuild **web** so the build-time flag lands. Confirm sitewide `noindex` gone. |
| **Verified** | `.env` + web container `NEXT_PUBLIC_DEMO_MODE=false`; `curl https://easycasaita.com/it` → **no** `noindex`; `robots.txt` → `Allow: /` + sitemap; no demo banner |
| **Then** | ~~Dispatch T33~~ → **done** (K EC 1.46 / #140) |

**Current:** `NEXT_PUBLIC_DEMO_MODE=false`; T33 web image live.

---

## 1b. T33 — SEO wiring ✅ DONE

| | |
|---|---|
| **PR** | [#140](https://github.com/aziz-mubasher/EasyCasa/pull/140) · tip `c6e4fdc` |
| **Shipped** | `serializeJsonLd` everywhere; FAQPage+Service on sell-privately; RealEstateListing on listings; honest sitemap; CI `check:json-ld-escape` |
| **Residual** | Lighthouse SEO ≥95 — **done** (100 / 100 / 100). Record: `docs/audits/EC-S-t33-lighthouse-scores.md`. Listing meta fix tip `1f1269b`. |

---

## 2. G1 — counsel T02 / T04 / T05 + informativa version ✅ DONE

| | |
|---|---|
| **Sign-off** | AZM 2026-08-13 — `docs/audits/EC-S-g1-signoff-enablement.md` |
| **Version** | `INFORMATIVA_SELLER_VERSION=v1.1` |
| **Flags** | `SELLER_ONBOARDING_ENABLED=true` · `SELLER_INBOX_ENABLED=true` · `NEXT_PUBLIC_SELLER_INBOX_ENABLED=true` (Docker build-arg) |
| **Verified** | `/api/seller/me` + `/api/seller/enquiries` → **401**; `/it/seller/enquiries` → **Richieste** UI; sell-privately still **fallback** copy |
| **Feedback** | `docs/audits/EC-S-g1-completion-feedback.md` |

**Ledger note:** `savingsFigures` / `mediazioneCopy` stay **fallback** until a dedicated flip PR.

---

## 2b. Dual inbox enablement ✅ DONE (with G1)

Was blocked on G1; completed in the same ops pass. Docker ARG gap fixed in `d4ad149`.

---

## 3. Counsel Claims 7–8 → boost / directory flags ✅ DONE

| | |
|---|---|
| **Sign-off** | AZM 2026-08-13 — `docs/audits/EC-S-claims-7-8-signoff-enablement.md` |
| **Packet** | `docs/legal/ec-s-t02-claims-7-8-addendum.md` (signed) |
| **Claim 7** | IT master `In evidenza` (+ aria / directoryNote) → `LISTING_BOOST_ENABLED=true` |
| **Claim 8** | IT master `Elenco informativo — nessuna commissione` → `PARTNER_DIRECTORY_ENABLED=true` |
| **Ops** | API recreate only (runtime flags; no web rebuild) |
| **G3 row 9** | Still blocks **paid** partner referral variants — v1 directory is informational only |
| **Feedback** | `docs/audits/EC-S-claims-7-8-completion-feedback.md` |

---

## 4. Stripe Price IDs

| | |
|---|---|
| **Owner** | Ops / Stripe Dashboard |
| **Boost** | Optional: `STRIPE_PRICE_BOOST_7D` / `STRIPE_PRICE_BOOST_30D` — empty → Checkout `price_data` with flat cents from shared `BOOST_FLAT_PRICE_CENTS` |
| **Premium** | Required for purchasable `seller_premium`: set `plans.stripe_price_id` (seed in migration `0061` may lack live Price ID) · then `SELLER_PREMIUM_ENABLED=true` |
| **Before flip** | Confirm flat-fee / success-independent (T04 row 8); webhook → local `seller_subscription` only |

---

## 5. Inbox enablement (dual flag) ✅ DONE

| | |
|---|---|
| **Flags** | Both true on VPS; web rebuilt with Docker build-arg (`d4ad149`) |
| **Route** | `/{locale}/seller/enquiries` live (sign-in panel) |
| **Note** | See §2 / `docs/audits/EC-S-g1-completion-feedback.md` |

---

## Still HOLD (not in your five — keep on the board)

| Item | Why |
|------|-----|
| **T25** in-portal messaging | T05 §6.5 controllership |
| **T19.2** dup-enforce + suspend UX | LIA |
| **P3 / P6 / P7 ledger flips** | Counsel + feature flags (`VERIFIED_OWNER_*`, checklist, analytics) |
| **Bunny CDN (`MEDIA_CDN_ENABLED`)** | DPA / T10 partial |

---

## Suggested Kaizen / Bridge sequencing

| Step | Board | Who | Cursor eng? |
|------|-------|-----|-------------|
| A | Ops: G7 DEMO_MODE off + web rebuild | Ops | ✅ done |
| B | Dispatch **T33** SEO wire | Eng | ✅ done |
| C | Counsel T02/T04/T05 + Claims 7–8 | Counsel / AZM | ✅ G1 + Claims 7–8 done |
| D | Ops: Stripe Prices → premium flag | Ops | No |
| E | Dual inbox flags + rebuilds | Ops | ✅ done with G1 |
| F | Optional: ledger `fallback`→`live` copy PR | Eng | Yes — after Claim 1–2 text confirmed |
| G | Optional: VO / checklist / analytics flips | Ops+product | No code if already built |

---

## One-liner for Claude / Bridge

> EC-S eng track closed for T01–T33 (HOLD **T25/T19.2**). G1 + Claims 7–8 flags on. Next human gates: Stripe Prices → `SELLER_PREMIUM_ENABLED`; optional ledger Claim 1–2 `live` flip; HOLDs (T25, Bunny DPA, G3 row 9 monetised partners).
