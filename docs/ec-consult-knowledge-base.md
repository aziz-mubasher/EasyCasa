# EC Consult — Knowledge base (Selling / Buying)

**Type:** R&D report + operator / Consult source of truth  
**Date:** 2026-09-04  
**Venture:** EasyCasa Italia · easycasaita.com · Mundida S.r.l. (P.IVA IT04531990986)  
**Channel this answers:** WhatsApp welcome buttons `sell_property` / `buy_property` (live on `main` @ `4ffd1fe`) and any later Consult / FAQ / canned-reply surface that uses the same two intents.  
**T04 rows:** 1–9 (portal tools + flat-fee options). **Rows 10–12 stay prohibited.**  
**Sign-off capacity:** product-owner copy (AZM). Not external counsel. Do not tell a consumer that a lawyer approved EasyCasa’s regulatory status.

This file is the knowledge base. When someone taps **Selling a property** or **Buying a property**, humans and any future auto-reply must explain EasyCasa from here — not from Banks4All Consult, not from the seed mediation catalog, and not from the brand tagline *“agenzia regolare”*.

---

## 1. Why this exists

Live WhatsApp after language pick is:

| Button id | EN title (≤20) | What happens today |
|-----------|----------------|--------------------|
| `buy_property` | Buying Property | One short text: “search listings on the site — a person will reply” |
| `sell_property` | Selling Property | One short text: “list from the site — a person will reply” |
| `easy_legenda` | Easy Legenda | CTA to `https://legenda.easycasaita.com` |

Those one-liners are not a knowledge base. Operators then get “what do you actually do?” with no single article. This document is that article set.

**EC Consult** in this repo is **not** a shipped product. B4A Assist / Consult / FAQ was deliberately **not** copied (`docs/whatsapp-channel.md`). The shape we want next is B4A-like (intent → article → optional sub-buttons → human), with **EasyCasa portal copy**.

---

## 2. Who EasyCasa is (say this first, both buttons)

**Default posture (private compravendita path):**

EasyCasa Italia is a **listing portal**. It hosts owner listings and gives both sides **neutral tools**: search, OMI market bands, enquiry transport, viewing calendar, optional flat-fee extras. On this path EasyCasa **does not perform mediazione immobiliare** and **does not take a provvigione** on the sale price.

Canonical enquiry disclosure (IT, live):

> EasyCasa opera come portale di pubblicazione annunci: non svolge attività di mediazione immobiliare su questa richiesta e non matura una provvigione sul prezzo di vendita. Eventuali servizi opzionali (es. boost, premium, elenco professionisti a tariffa fissa) hanno un prezzo separato, indicato prima dell'ordine, indipendente dall'esito della vendita.

**Copy rule (T04):** describe tools as things the **seller or buyer does**, never things EasyCasa does *to the deal*.

**Do not collapse two paths:**

| Path | Who it is for | Money | Consult must |
|------|----------------|-------|--------------|
| **A — Portale / vendi-da-privato / for-buyers** | Private owner and private buyer | Listing, enquiry, viewing tools **€0**. Optional extras are **flat** | This is the default answer |
| **B — Optional paid / foreign-buyer support** | People who *choose* a priced service | Acquisto Assistito, boost, Premium, partner directory, Aste credits | Quote only live landings. Never invent a % of sale |
| **C — Catalog seed `FULL_MEDIATION` / `OFFER_DRAFTING` / `BUYER_MEDIATION`** | Design placeholders in `catalog.ts` | Some rows are **% / proposta** | **Do not sell these.** T04 rows 10–11. Hand off to a human if they insist |

**Open company question (do not resolve in chat):** Mundida’s REA / mediazione registration is **unverified**. Live consumer copy says “non svolge mediazione” on the portal path. Consult must **not** say “we are a licensed agency” *or* “counsel confirmed we are not a mediatore”. If asked, say: *this channel explains the portal products; a person will confirm any licensed-mandate question.*

Sister company: **Banks4All** (same Mundida group, **separate entity**). Credit / mutuo / PIP is Banks4All. EasyCasa only **displays** a third-party buyer badge. Never take a credit-need intake here.

---

## 3. Hard refusals (both buttons)

Refuse and escalate to a human. Do not give a workaround.

| Topic | Why | What to say instead |
|-------|-----|---------------------|
| Collect or forward an **offer** / “tell them I’ll pay X” | T04 row 10 | Buyer writes the owner via the listing enquiry. EasyCasa does not transmit offers |
| *Proposta d’acquisto*, *caparra*, deposit handling | T04 row 11 | Notary / their lawyer. EasyCasa does not draft or hold money |
| Negotiation advice (“should I drop the price?”, “accept this?”) | T04 row 12 | We show OMI data. The decision is yours. We do not advise on the deal |
| Price recommendation / “what should I ask?” | T04 row 3 | Show how to open the OMI band on the listing / wizard. No number from us |
| Fee as **% of sale** or success-contingent portal fee | T04 row 8 | Portal extras are flat and independent of whether the house sells |
| **`sanabilità`**, generated legal risk, “you will win the asta” | CLAUDE.md §3 | Easy Legenda is extract-and-cite. Avvocato / tecnico abilitato for reserved acts |
| Unredacted auction debtor / CF / third-party names | CLAUDE.md §6 | Never ask the user to paste those into WhatsApp |
| Credit advice, lender routing, “can I get a mutuo?” | Banks4All / OAM | Point to `/{locale}/banks4all`. Do not collect income or collect a credit need |

Search-brief text is a **search preference**, never an offer (already in WhatsApp copy).

---

## 4. Button A — Selling a property (`sell_property`)

### 4.1 Intent

The person wants to **sell an Italian property themselves** (or understand how). Default to the **private-seller portal**, not an agency mandate.

Live marketing: `/{locale}/vendi-da-privato`  
IT `/vendi-da-privato` · EN `/sell-privately` · ES `/vender-entre-particulares`  
Start listing: `/{locale}/add` → wizard `/{locale}/seller/list`

### 4.2 Article — operator / Consult (EN)

**EasyCasa for sellers**

EasyCasa Italia is a **publication portal** for private owners. You publish the listing. You receive enquiries. You publish viewing slots. You stay in charge of the sale. EasyCasa does **not** negotiate for you, does **not** collect offers, and does **not** take a percentage of the sale.

**What is free**

- Create and publish a listing (guided wizard)
- Enquiries from buyers (inbox + in-portal thread)
- Viewing calendar: you publish slots, buyers book, you confirm
- Official **OMI** zone bands next to your asking price (Agenzia delle Entrate statistics — data, not “we suggest you price at X”)
- Document checklist (APE, planimetria, visura — organised and not shown to the public)
- **Verified Owner** badge after you upload ownership documents and staff review them
- Seller analytics (views, saves, enquiry rate) when the listing is live
- No exclusivity, no mandate required. You can still list with an agency elsewhere

**How it works (you do these steps)**

1. Create an account and complete seller onboarding (informativa).
2. Open the listing wizard: address, photos, description. The site pre-fills market context for the zone.
3. Set an asking price **you** choose; look at the OMI range for that zone before you publish.
4. Upload visura (and other checklist docs) if you want the Verified Owner badge. Moderation only — documents are not on the public listing.
5. Publish. Buyers search, enquire, and book viewings from your real availability.
6. After a visit, both sides can record how it went. Close (preliminare, rogito) happens **off-platform** with the professionals you choose.

**Optional paid extras (flat, shown before you pay, independent of sale)**

| Extra | Typical live price | What it is |
|-------|--------------------|------------|
| Featured / boost 7 days | €9.90 | Extra visibility in search |
| Featured / boost 30 days | €24.90 | Same, longer window |
| Seller Premium | €19 / month | Higher listing + upload quotas, longer analytics |
| Partner directory | Flat placement (see `/pricing` / directory) | Informational list of notaio, geometra, APE, photographer — **Presenza a pagamento** when paid. You contact them. EasyCasa does not take a mandate commission |
| À-la-carte catalog | Live on `/{locale}/pricing` | Document / media / valuation items. **Admin catalog is source of truth.** Do not quote seed design prices as guaranteed |

We earn from extras you choose — **never from a cut of your sale** on the portal path.

**What EasyCasa is not (seller)**

- Not your negotiator
- Not an offer desk
- Not a *proposta* / *caparra* office
- Not a substitute for notaio, geometra, or avvocato
- Not Banks4All (the buyer financial badge is their attestation, displayed on the enquiry)

**Useful links**

- Sell privately: https://easycasaita.com/it/vendi-da-privato  
- Create listing: https://easycasaita.com/it/add  
- Pricing: https://easycasaita.com/it/pricing  
- Partner directory: https://easycasaita.com/it/partner-directory  
- Privacy / your data: https://easycasaita.com/it/i-miei-dati  

A person on this WhatsApp can help you start. They will not price the house or negotiate with a buyer for you.

### 4.3 Article — operator / Consult (IT)

**EasyCasa per chi vende**

EasyCasa Italia è un **portale di pubblicazione annunci** per privati. Pubblichi tu l’annuncio, ricevi le richieste, apri i tuoi slot per le visite. Non siamo mediatori su questo percorso: non trattiamo per te, non raccogliamo offerte, non prendiamo una **provvigione** sul prezzo di vendita.

**Cosa è gratuito**

- Pubblicazione annuncio (wizard guidato)
- Richieste dei compratori e thread in piattaforma
- Calendario visite: pubblichi gli slot, il compratore prenota, confermi tu
- Fasce **OMI** della zona (dati ufficiali, non un consiglio di prezzo)
- Checklist documenti (APE, planimetria, visura) — privati, non in vetrina
- Badge **Verified Owner** dopo verifica documenti
- Analytics (visualizzazioni, salvataggi, richieste)
- Nessuna esclusiva, nessun incarico obbligatorio

**Come funziona**

1. Account + onboarding venditore (informativa).
2. Wizard: indirizzo, foto, testo. Il contesto di mercato della zona è precompilato.
3. Prezzo chiesto **da te**; confronti la fascia OMI prima di pubblicare.
4. Carichi la visura se vuoi il badge proprietario verificato (solo moderazione).
5. Pubblichi. I compratori cercano, scrivono, prenotano le visite.
6. Il closing (preliminare, rogito) è **fuori portale**, con i professionisti che scegli.

**Extra a pagamento (tariffa fissa, indipendente dalla vendita)**

In evidenza 7 giorni €9,90 · 30 giorni €24,90 · Premium venditore €19/mese · elenco professionisti a tariffa fissa · altri servizi sul listino `/pricing`.

**Cosa non facciamo**

Non negoziamo, non trasmettiamo offerte, non redigiamo proposte d’acquisto, non gestiamo caparre. Banks4All è una società del gruppo distinta: il badge finanziario del compratore è una loro attestazione, non una nostra garanzia di solvibilità.

### 4.4 Seller FAQ (Consult follow-ups)

**Is it really free?**  
Listing, enquiries and viewing tools are free. Optional services are priced separately — never as a percentage of the sale.

**What documents?**  
Typically APE, planimetria, visura. The in-app checklist tells you what is needed. Public visitors do not see the files.

**Verified Owner?**  
You upload ownership evidence. Staff review. The listing can show a badge. Documents stay off the public page.

**Can I also use an agency?**  
Yes. No exclusivity.

**Who provides the buyer money badge?**  
Banks4All (Mundida group, separate company). EasyCasa only displays the attestation. We do not say the buyer “can pay”.

**Will you find me a buyer / call people for me?**  
No matching, no outbound buyer hunt as a mandate. Buyers find the listing on the portal and write or book.

**Can you write the proposta?**  
No. T04 row 11. Notaio / their lawyer.

### 4.5 Suggested next WhatsApp buttons after `sell_property` (not built yet)

Meta max **3** reply buttons. Proposed ids (new, never B4A credit ids):

| id | Title ≤20 | Action |
|----|-----------|--------|
| `sell_how` | How it works | §4.2 how-it-works short |
| `sell_price` | Free vs paid | Free list + flat extras |
| `sell_start` | Open listing | CTA URL `https://easycasaita.com/it/add` |

---

## 5. Button B — Buying a property (`buy_property`)

### 5.1 Intent

The person wants to **buy a home in Italy** (resident or not). Default to the **free buyer portal**. Offer Acquisto Assistito only if they are foreign / need paid support. Offer Easy Legenda only if they mention **aste giudiziarie** (third button already exists).

Live marketing: `/{locale}/for-buyers`  
Search: `/{locale}/search`  
Foreign-buyer paid path: `/{locale}/acquisto-assistito` (`mailto:acquisti@easycasaita.com`)  
Banks4All hub: `/{locale}/banks4all` (optional, never required)

### 5.2 Article — operator / Consult (EN)

**EasyCasa for buyers**

EasyCasa Italia publishes **private-owner listings**. You search, you check the official OMI band on the listing, you write the owner, you book a viewing from their real slots. There is **no buyer-side agency commission** on this portal path. EasyCasa does not charge you a percentage of the purchase.

**What is free**

- Search verified private listings (filters: area, price, type)
- Listing page with **OMI** zone range (same Agenzia delle Entrate dataset used for tax statistics — a check, not a valuation you can take to a bank as official)
- Enquiry to the owner (you see a portal / no-provvigione disclosure when you send)
- Book a viewing online; confirmation; after the visit you can say whether the home matched the listing
- Favourites and saved searches
- Report a listing if something is off

**How it works**

1. Search on the site.
2. Open a listing and see where the asking price sits versus the OMI zone band.
3. Enquire directly — attach a Banks4All **Verified Buyer** badge if you have one (optional; not required to enquire or book).
4. Book a slot from the owner’s availability.
5. Visit. Agree terms **with the owner**. EasyCasa does not carry offers or drafts.

**Trust signals you may see**

- Identity-checked / Verified Owner sellers
- Cadastral identifiers on the listing
- Price-anomaly review when an ask is far outside the zone band
- Private-seller positioning (agencies posing as privates can be removed)
- Accountability after viewings

**Optional, not required**

| Product | Who | What Consult may say |
|---------|-----|----------------------|
| **Verified Buyer Badge** | Banks4All (sister company) | Financing attestation they issue. EasyCasa displays band + expiry + initials. We make **no solvency claim**. Using B4A is never required to use EasyCasa |
| **Acquisto Assistito** | EasyCasa paid support for **non-resident** buyers | Fixed fees **+ IVA 22%** on the landing: Verifica €290 · Acquisto Assistito €1,490 · Trasferimento €2,900. CTA `acquisti@easycasaita.com`. This is **not** the free portal path. Do not describe it as “we negotiate the price for you” |
| **Easy Legenda / Aste** | Separate analysis product | Reads a court file (perizia, ordinanza, avviso) and shows **what the document says**. First file free on their landing. **Not** legal or technical advice. Not bidder representation. Use the Easy Legenda button / https://legenda.easycasaita.com |

**What EasyCasa is not (buyer)**

- Not your buyer’s agent on the portal path
- Not an offer / *proposta* / *caparra* desk
- Not a mortgage broker (that is Banks4All, if they choose)
- Not a lawyer or geometra
- Not a promise that a listing is “cheap” or “a good deal” — OMI is a statistical band

**Useful links**

- For buyers: https://easycasaita.com/it/for-buyers  
- Search: https://easycasaita.com/it/search  
- Buying from abroad: https://easycasaita.com/it/acquisto-assistito  
- Banks4All hub: https://easycasaita.com/it/banks4all  
- Easy Legenda: https://legenda.easycasaita.com  

Tell us the **city and price band** you are looking at (preference, not an offer). A person will help you find the listing or a viewing slot.

### 5.3 Article — operator / Consult (IT)

**EasyCasa per chi compra**

EasyCasa Italia pubblica **annunci di privati**. Cerchi, confronti la fascia OMI, scrivi al proprietario, prenoti la visita dai suoi slot. Su questo percorso **non c’è provvigione acquirente** verso EasyCasa.

**Cosa è gratuito:** ricerca, scheda con fascia OMI, richiesta al proprietario, prenotazione visita, preferiti, segnalazione abusi.

**Come funziona:** cerca → controlla il prezzo rispetto all’OMI → scrivi al proprietario (con badge Banks4All se ce l’hai) → prenota lo slot → visiti. Le condizioni le trattate **voi due**. EasyCasa non trasmette offerte.

**Opzionale:** badge acquirente verificato (Banks4All, società distinta); **Acquisto Assistito** per non residenti (tariffe fisse sulla pagina, + IVA); **Easy Legenda** per i fascicoli d’asta (estratto dal documento, non consulenza).

**Non facciamo:** mediazione sull’affare, proposte, caparre, consigli di trattativa, mutui.

### 5.4 Buyer FAQ

**Do I pay EasyCasa if I buy?**  
Not a commission on the price. The portal path is free for buyers. Paid products (Assistito, Aste credits) are separate and listed before you order.

**Is the OMI number the “right” price?**  
No. It is official zone statistics. You decide. We will not recommend a bid.

**Can you send my offer to the owner?**  
No. Use the listing enquiry / WhatsApp with the owner after they reply. We do not carry offers.

**I live abroad.**  
Start with `/acquisto-assistito` or email `acquisti@easycasaita.com`. Still no % of sale on those published tiers.

**I want a mutuo.**  
Banks4All, not this chat: `/{locale}/banks4all`.

**Auction / esecuzione?**  
Easy Legenda button. Do not paste debtor names or codice fiscale here.

### 5.5 Suggested next WhatsApp buttons after `buy_property` (not built yet)

| id | Title ≤20 | Action |
|----|-----------|--------|
| `buy_how` | How it works | §5.2 short |
| `buy_search` | Open listings | CTA URL site `/search` |
| `buy_help` | City + budget | Prompt search-preference (not an offer) |

If they need abroad / asta, the human offers Assistito or the existing `easy_legenda` button — do not cram a fourth root intent into the welcome row (Meta max 3).

---

## 6. Third button (do not mix into sell/buy articles)

**Easy Legenda** (`easy_legenda`) is **Aste Analysis**, not the private portal.

- Input: court file documents the user already has
- Output: structured extract + citations. Informational. Disclaimer live: EasyCasa does not give legal / technical advice or statutory perizie
- First fascicolo free (current WhatsApp line)
- Credits for more reports: packs on the Aste product (€9.90 / €24.90 / €69.90 indicative)
- **Banned in replies:** `sanabilità`, risk ratings as advice, “you should bid X”, bidder representation (vendita senza incanto is lawyer-only if anyone submits an offer)
- Redact debtor / third-party PII; never re-publish a perizia in chat

If a seller/buyer tap turns into “I’m looking at an asta”, switch to this article and the Legenda URL. Do not treat an auction file as a normal listing.

---

## 7. WhatsApp / CRM wiring (repo reality)

Already live (`apps/api/src/whatsapp/whatsapp-journey.ts`):

- Language list: `it en es fr de pt ur hi pa ar`
- Welcome buttons: `buy_property` · `sell_property` · `easy_legenda`
- Legacy in-flight: `book_viewing` · `search_brief` · `open_listings`
- CRM: inbound → `source=whatsapp`; Aste waitlist/analysis → `source=aste` badge **Easy Legenda**
- Hours: 06:00–22:00 Europe/Rome; off-hours text then same buttons
- Established portal clients (`contact_type=client`) skip automation — human only

**Gap this KB fills:** `buyProperty` / `sellProperty` strings are two sentences. Operators have no article. Canned Hub replies can paste §4.2 / §5.2 until a Consult tree is built.

---

## 8. Implementation brief for the next Cursor task (do not do it in this docs PR)

1. Replace the two one-liners with the **short** IT/EN/ES (and then the other 7 locales) versions of §4.2 / §5.2 — WhatsApp practical length: **one screen**, then “tap for how it works / free vs paid / open site”.
2. After `sell_property` / `buy_property`, send **three** follow-up buttons (`sell_how` / `sell_price` / `sell_start` and `buy_how` / `buy_search` / `buy_help`).
3. Load canned replies in `#whatsapp` Hub from this file (IT + EN minimum).
4. Keep T04 refusals in fixtures (same as AI service: no price advice, no offer language).
5. Do **not** import B4A Consult articles or credit button ids (`plan_mutuo`, `buying_a_house`, Assist/FAQ).
6. Do **not** flip `ASTE_ANALYSIS_ENABLED` as part of Consult.
7. Cite T04 rows 4–5 for transport; refuse 10–12 in tests.

---

## 9. Source map (do not invent beyond these)

| Need | Source |
|------|--------|
| Portal / no provvigione | `docs/legal/mediation-disclosure.md` |
| Feature matrix | `docs/legal/T04_mediazione_boundary.md` |
| Delta (REA, Aste, art. 348) | `CLAUDE.md` |
| Seller promises live/coming | `apps/web/src/config/sell-privately/promises.json` (P1–P8 **live**) |
| Seller journey stages | `docs/ec-s-seller-journey-completion.md` |
| Buyer marketing | `apps/web/messages/*/forBuyers` · `/for-buyers` |
| Seller marketing | `apps/web/messages/*/sellPrivately` · `/vendi-da-privato` |
| Assistito fees | `docs/acquisto-assistito.md` |
| Boost / Premium | `@easycasa/shared` listing-boost + migration `0061` |
| Catalog caution | `apps/api/src/service-catalog/domain/catalog.ts` (seed; admin is SoT) |
| WhatsApp buttons | `apps/api/src/whatsapp/whatsapp-journey.ts` on `main` |
| B4A badge limits | `docs/banks4all-integration.md` |

---

## 10. R&D FEEDBACK — for Claude

### BRIEF ADHERENCE
- Asked: R&D report + KB for **Selling a property** and **Buying a property**.
- Delivered: one canonical KB both buttons can speak from, plus refusals, third-button (Easy Legenda) fence, and a follow-up implementation brief.
- Did **not** implement Consult auto-tree or change WhatsApp strings in this change (docs only).

### WHERE THE BRIEF FAILED YOU
- “EC Consult” is not a product in this repo. Interpreted as: knowledge base for the **already-live** WhatsApp `sell_property` / `buy_property` taps, reusable by Hub canned replies and a later Consult tree.
- “Everything about EasyCasa” collides with two money paths and an unverified REA. Defaulted Consult to **path A (portal)** and isolated catalog % / proposta as **do not sell**.

### REPO REALITY CHECK
- Welcome on `main` is already buy / sell / Easy Legenda. Articles today are one-liners in `whatsapp-journey.ts`.
- Live seller/buyer surfaces are the Next.js pages above, not a Consult microservice.
- AI assistant (`POST /ai/assistant`) is listing-retrieval, not this KB.

### EFFORT SIGNAL
- Correctly one docs task. Implementing the button tree is a **second** focused PR.

### BLOCKED / NEEDS A HUMAN
- Visura / REA (§1.2 CLAUDE.md) before any Consult sentence about “we are / are not licensed”.
- Confirm Assistito tiers and Aste “first file free” still match live Stripe / flags before quoting in paid ads.
- Boards: Kaizen **Operations** if this becomes a build task; no new Kaizen invented here.

### NEXT TASK SHOULD ACCOUNT FOR
- Implement §8 only. Keep this file as the copy source (IT/EN first).
- WhatsApp body length vs full §4.2 — summarise, then sub-buttons.
- Do not put Easy Legenda legal analysis into the buy/sell articles.
