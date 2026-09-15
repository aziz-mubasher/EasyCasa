# About (`/[locale]/about`) — claims register

**Date:** 15 September 2026 · **Page:** `https://easycasaita.com/en/about`  
**Gates:** G1 (catalogue / `BUYER_MEDIATION`) · G4 (`routeLead` / EC-S-36) · CLAUDE.md §5 (`PRE_INCORPORATION`)

Licence column is whether the **claim** is lawful to make, not whether EasyCasa holds a mediazione enrolment today. Operating posture in this repo is **PONTE**. There is still no `LEGAL_ENTITY` / `PERIMETER` object (`docs/legal/AYNI_STATE_AUDIT.md`). The mediation-registration string is banned in tests (`apps/web/src/lib/legal-identity-honesty.spec.ts`) instead.

---

## Live

| Key | Status | Claim | Evidence |
|---|---|---|---|
| `aboutUs.hero.title` / `lede` | `live` | Paid a fixed sum for a defined service, due on delivery. Sale / price do not change the fee. | `appalto di servizi` framing already on `/pricing`. Catalogue items used here are flat seller-side services. |
| `aboutUs.hero.status` | `live` | Service company, not enrolled, intend to apply; we say what we do not do. | Same non-enrolment sentence as `footer.enrollment` / `pricing.pageFooter.enrollment`. Positioning call (fuller PONTE), not a new legal fact. |
| `aboutUs.pillars[0]` | `live` | Publish the OMI range + semester; do not say whether a price is good. | T04 row 2 / row 3. Not a *stima*. |
| `aboutUs.pillars[1]` | `live` | Fixed prices, same on €150k and €800k. **No zero-commission sentence.** | G1 correction: “Sellers pay no commission” / “we do not take a percentage” cannot be said while %-of-sale SKUs remain in `catalog.ts`. |
| `aboutUs.pillars[2]` | `live` | Agency fee stays with the agency; never per lead, never per deal. | Same rule as the agencies honesty pass. |
| `aboutUs.explore` | `live` | Index includes agencies. OMI link → `/for-buyers`, not `/valutazione-gratuita`. | Avoids promising a *valutazione* (ATECO 68.31) from About. |
| `aboutUs.groupNote` | `live` | Easy Legenda + NIB named so the page matches the footer stakeholders. | Labels only. |
| Shared chrome | `live` | `/about` is **not** a marketing-service path. Header + footer from the shared layout. | `isMarketingServicePath('/about') === false`. |
| Identity (footer / `/trasparenza` / `/legal/mediation` / `forBuyers.foot.mundida`) | `live` | `/pricing` named hole + Mundida **licence**, not Mundida’s P.IVA as EasyCasa’s. | `status: PRE_INCORPORATION`. |

---

## Retracted (must not return)

| Former claim | Why | Next |
|---|---|---|
| “Direct buying and selling, with no commission.” | G1. Catalogue still has %-of-sale SKUs; agency listings carry the agency’s commission. | Do not soften to “almost” or “no commission from us”. |
| “Sellers pay no commission” / “We do not take a percentage of the sale price.” | G1 correction (acquisto-assistito check §9). False while `FULL_MEDIATION` / `BUYER_MEDIATION` remain in the TypeScript catalog. | G1 adds the percentage denial back after PR A is true in the served catalogue. |
| “Everyone else in this transaction is paid when it closes. We are paid on delivery.” | Same G1 gate. | Restore with the percentage denial. |
| “Every listing is published by an identity-verified person… not after something goes wrong.” | False (`verified_owner_case = 0`; Keycloak does not verify email). Assumes a check that does not run. | **No replacement card.** `[[BUCO: cosa viene effettivamente verificato al publish — EC-S-36]]` |
| “owners and buyers can deal with each other directly” | G4. `PartnersService.routeLead` still scores and assigns. | Census, then `routeLead` off. |
| Energy-class publish gate | 92/118 live adverts lack class + index. | Write only after the invariant is real. |
| `Estate mediation activity — registration [—]` on `/trasparenza` and `/legal/mediation` | Asserts a registration exists and omits the number. §3 rule 2. | Banned in `legal-identity-honesty.spec.ts`. |
| Mundida `P.IVA IT04531990986` presented as EasyCasa / Easy Casa Italia | Wrong subject. | Named hole until incorporation. |

---

## Holes (not invented)

1. **Card 01 / publish checks** — wait for EC-S-36. Do not invent a verification claim.
2. **Legal entity fields** — `denominazione / P.IVA / REA / sede` stay a marked hole.
3. **Energy class as a differentiator** — gated on live catalogue data.
