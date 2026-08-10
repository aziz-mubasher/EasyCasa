# EC-S-T01 — Sell Privately (`vendi-da-privato`)

**Route:** `/{locale}/vendi-da-privato` · EN rewrite `/en/sell-privately` · ES rewrite `/es/vender-como-particular`  
**Placement:** Site footer, column “Per chi vende” — label **Vendi da privato** / **Sell privately**.  
**Stack:** Next.js App Router static page; brand tokens from `easycasa-brand.css`.

## Honesty mechanic — promise ledger

Availability is **never hardcoded** in JSX. Every benefit tile and how-it-works step reads `status` from:

`apps/web/src/config/sell-privately/promises.json`

| Status  | UI |
|---------|----|
| `live`  | Shown as available |
| `coming`| Shown with subtle “In arrivo” / “Coming soon” chip — never as available |
| `hidden`| Not rendered |

Flip flags to `live` when the matching roadmap task ships. Copy lives in `messages/{en,it,es}.json` under `sellPrivately`.

## Page structure

1. Hero + dual CTA (create listing / how it works)
2. Savings block (counsel-gate T02) — optional price → saving slider
3. How it works (5 steps, ledger-driven)
4. Benefits grid (P1–P8, ledger-driven)
5. “What EasyCasa is not” (mediazione boundary — align with T04)
6. FAQ (6–8)
7. Final CTA + page legal footer (informativa + privacy `1.0-draft`)

## Counsel gates

| Block | Gate | Notes |
|-------|------|--------|
| Savings copy + AGCM footnote | T02 | Ship as **counsel-review template** until signed off |
| Step 4 / Verified Buyer + Mundida | B4A-2 | Disclose Banks4All ∈ Mundida group; no independence wording |
| “What EasyCasa is not” | T04 | Portal vs mediazione boundary |
| Page legal footer / privacy version | T30 | Consent ledger version string |

## SEO (T33)

- Title (IT): `Vendere casa da privato senza agenzia | EasyCasa`
- `FAQPage` + `Service` JSON-LD
- Target queries: vendere casa da privato, vendere casa senza agenzia, quanto costa vendere casa con agenzia

## Acceptance

- [ ] IT + EN (+ ES) render; ledger drives availability; zero hardcoded claims
- [ ] Money figures: IBM Plex Mono tabular-nums; estimates ochre `#C08A1E`
- [ ] Footer link on all non-marketing-chrome pages
- [ ] Schema validates; Lighthouse ≥ 90 mobile (follow-up check)
