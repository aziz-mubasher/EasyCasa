# EasyCasa — Property Taxonomy Specification
**Italian market · multi-axis model · v1 draft for review**

> **Why this exists.** The current `Tipologia` filter collapses four unrelated dimensions into a single list (Residential, Commercial, New Build (NIB), Renovatable, Auction, Rooms). A user cannot express *"residential apartment, needs renovation, available rent-to-buy"* — and a villa needing work has nowhere to sit. This document separates them into independent axes.
>
> **Two corrections to the current model:**
> 1. **NIB is not "New Build."** NIB describes properties a seller will transact **without the buyer needing a traditional bank mortgage** — rent-to-buy, crowdfunding, seller financing, and similar. It is a *financing structure*, not a build state. The current label `New Build (NIB)` conflates two unrelated concepts.
> 2. **Auction is not a property type** — it is a sale mechanism with its own legal process.
>
> **Not legal advice.** Several categories below (rent-to-buy, nuda proprietà, judicial auctions, lease types) have specific Italian legal frameworks. Confirm all of it with Italian counsel — ideally in the same review as the outstanding privacy and mediation documents.

---

## The axes

A listing is described by **independent** attributes, not one bucket:

| # | Axis | Field | Required | Multi-select |
|---|---|---|---|---|
| 1 | Transaction type | `transactionType` | ✅ | No |
| 2 | Destinazione d'uso | `assetClass` | ✅ | No |
| 3 | Tipologia immobiliare | `propertyType` | ✅ | No |
| 4 | Stato dell'immobile | `condition` | ✅ | No |
| 5 | **Modalità di acquisto (NIB)** | `financingOptions` | ❌ | **Yes** |
| 6 | Tipo di contratto (rentals only) | `leaseType` | conditional | No |
| 7 | Venditore | `sellerType` | ✅ | No |

---

## 1. `transactionType` — how it changes hands

| Slug | IT | EN |
|---|---|---|
| `sale` | Vendita | For sale |
| `rent` | Affitto | For rent |
| `auction` | Asta giudiziaria | Judicial auction |
| `bare_ownership` | Nuda proprietà | Bare ownership |

**Notes**
- **Asta giudiziaria** is a court-supervised process — custode, perizia, fixed deadlines, deposit rules. It is *not* ordinary mediation and likely needs a separate flow and disclaimers. Confirm with counsel whether EasyCasa can mediate these at all.
- **Nuda proprietà** (seller retains usufruct, typically for life) is common in Italy with elderly sellers. It changes valuation and the buyer's expectations fundamentally, so it belongs at transaction level rather than as a tag.

---

## 2. `assetClass` — destinazione d'uso

Legally significant in Italy: destinazione d'uso is recorded in the catasto and constrains permitted use.

| Slug | IT | EN |
|---|---|---|
| `residential` | Residenziale | Residential |
| `commercial` | Commerciale (negozi) | Retail / commercial |
| `office` | Uffici | Office |
| `industrial` | Industriale / capannoni | Industrial / warehouse |
| `land` | Terreni | Land |
| `garage` | Box e posti auto | Garage / parking |
| `hospitality` | Alberghiero / ricettivo | Hospitality |

**Land sub-type** (`landType`, only when `assetClass = land`): `agricultural` · `building` (edificabile) · `woodland` · `other`

---

## 3. `propertyType` — physical form

Valid values depend on `assetClass`. Residential set:

| Slug | IT | EN |
|---|---|---|
| `apartment` | Appartamento | Apartment |
| `studio` | Monolocale | Studio |
| `penthouse` | Attico | Penthouse |
| `loft` | Loft | Loft |
| `attic` | Mansarda | Attic |
| `villa` | Villa | Villa |
| `townhouse` | Villetta a schiera | Townhouse |
| `detached` | Casa indipendente | Detached house |
| `rustic` | Rustico / casale | Rustic / farmhouse |
| `farmhouse` | Cascina | Farmstead |
| `building` | Palazzo / stabile intero | Whole building |
| `room` | Stanza | Room |

**Note:** `room` replaces the old top-level "Rooms" category — a room is a physical unit, almost always rented, not a separate transaction class.

---

## 4. `condition` — stato dell'immobile

| Slug | IT | EN |
|---|---|---|
| `new_build` | Nuova costruzione | New build |
| `under_construction` | In costruzione | Under construction |
| `renovated` | Ristrutturato | Renovated |
| `good` | Buono stato / abitabile | Good condition |
| `to_renovate` | Da ristrutturare | Needs renovation |
| `shell` | Al grezzo | Shell / unfinished |

**This is where "New Build" actually belongs** — not bundled with NIB.

---

## 5. `financingOptions` — Modalità di acquisto (NIB) ⭐

**Multi-select.** Properties where the seller will transact **without the buyer obtaining a traditional bank mortgage**. This is EasyCasa's differentiator and deserves prominent placement, not burial in a type dropdown.

| Slug | IT | EN | Notes |
|---|---|---|---|
| `rent_to_buy` | Affitto con riscatto | Rent to buy | Regulated: *contratto di godimento in funzione della successiva alienazione* (D.L. 133/2014) — **verify with counsel** |
| `seller_financing` | Pagamento dilazionato | Seller financing | Instalments direct to seller |
| `retention_of_title` | Vendita con riserva di proprietà | Retention of title | Title transfers on final payment |
| `crowdfunding` | Crowdfunding immobiliare | Property crowdfunding | Fractional/collective purchase |
| `leasing` | Leasing immobiliare | Property leasing | Bank/lessor structure; distinct from mortgage |
| `barter` | Permuta | Property exchange | Swap, with or without cash adjustment |
| `life_annuity` | Vitalizio | Life annuity | Periodic payments to seller for life |
| `cash_only` | Solo contanti | Cash only | Seller will not wait for financing |

**Product implications**
- Should be a **first-class filter**, ideally surfaced on the homepage, not nested under Tipologia
- Warrants explanatory content — most buyers won't know what rent-to-buy entails
- Each option carries different contractual and tax consequences; the listing detail page should disclose which apply
- **Compliance flag:** promoting alternative financing may touch financial-promotion rules. Confirm before marketing it prominently.

---

## 6. `leaseType` — rentals only ⚠️ legally material

Required when `transactionType = rent`. Different types carry different registration, duration, and tax obligations — and your RLI integration depends on this.

| Slug | IT | Duration | RLI registration |
|---|---|---|---|
| `free_4_4` | Libero 4+4 | 4y + 4y | ✅ Required |
| `agreed_3_2` | Canone concordato 3+2 | 3y + 2y | ✅ Required |
| `transitional` | Transitorio | 1–18 months | ✅ Required |
| `student` | Studenti universitari | 6–36 months | ✅ Required |
| `short_stay` | Affitto breve | < 30 days | ❌ **Not required** |
| `commercial_6_6` | Commerciale 6+6 | 6y + 6y | ✅ Required |

**Critical:** `short_stay` (<30 days) is exempt from RLI registration and follows different tax and tourist-accommodation rules. Your RLI flow must branch on this — registering a short stay, or failing to register a 4+4, are both errors with consequences.

---

## 7. `sellerType`

| Slug | IT | EN |
|---|---|---|
| `private` | Privato | Private seller |
| `agency` | Agenzia | Agency |

Central to a commission-free positioning, and a standard filter on Italian portals.

---

## Worked examples — why one axis fails

| Listing | Old model | New model |
|---|---|---|
| Milan flat, needs work, rent-to-buy available | ❌ must pick *one* of Residential / Renovatable / NIB | `sale` · `residential` · `apartment` · `to_renovate` · `[rent_to_buy]` · `private` |
| Brescia shop at judicial auction | ❌ Auction *or* Commercial | `auction` · `commercial` · — · `good` · `[]` · `agency` |
| Student room, 12-month lease | ❌ "Rooms" only | `rent` · `residential` · `room` · `good` · `[]` · `private` · lease `student` |
| Tuscan farmhouse, permuta considered | ❌ no fit at all | `sale` · `residential` · `farmhouse` · `to_renovate` · `[barter, seller_financing]` · `private` |

---

## Migration considerations

**Existing data:** 18 listings, all `residential`, all Brescia province, currently carrying legacy category values. Map explicitly and report anything unmappable — do not guess.

**Backward compatibility:** `categorySlug` is live in the search API and the URL contract from PR #20. Either maintain a mapping layer or version the API; do not silently break existing shared search URLs.

**WordPress ETL:** already known to be unreliable — `province` and `city` read the same meta key (`map-city`). Assume category data has similar problems and validate rather than trust.

**Filter UI:** `Tipologia` becomes several controls. On mobile this needs a bottom-sheet or grouped panel; a single row of seven dropdowns will not fit.

**Open questions for a human decision**
1. Does EasyCasa mediate judicial auctions at all, or only surface them?
2. Should NIB appear on the homepage as a headline entry point?
3. Do rent-to-buy and crowdfunding require additional disclosures or licensing?
4. Which axes are mandatory at listing creation vs optional?
