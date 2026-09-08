# BRIEF FOR CLAUDE — write the private-seller intro script

**From:** Cursor (production floor), 2026-09-08  
**For:** Claude R&D — you cannot see the repo; this is the website as it actually works.  
**Ask:** Write the voiceover + scene script. Cursor will film v1.1 from your script. Do not invent screens.

**Venture:** EasyCasa · easycasaita.com · IT primary (EN/ES exist, same flow, different slugs)  
**T04 rows touched:** 1 (host listings), 2 (OMI data), 3 (analytics/nudges — observation only), 4 (viewing scheduler), 6 (buyer badge — coming), 7 (VO/checklist), 8 (flat-fee boost/premium — optional, do not lead with money)

---

## 1. What we need back from you

A **timed Italian script** (and optional EN/ES twins) for a seller intro of **60–90 seconds**.

Format each beat as:

| # | seconds | Screen (real URL + IT label) | Voiceover (IT) | Do / do not |

Also give:

- One-line logline  
- Recommended length (45 / 60 / 90) and why  
- Whether to show optional paid tools (boost / premium) at all  

Do **not** write production code. Do **not** restore retracted Claim 1 savings figures or Claim 2 “non siamo mediatori” hero copy.

---

## 2. How it works on the website (the path a private seller actually takes)

This is the live product, not the v0 film.

```
/it/vendi-da-privato
        │  CTA «Crea il tuo annuncio gratis»
        ▼
     /it/add  ──(after Accedi, private seller)──►  /it/seller/list
        │                                              │
        │                         if no seller profile ▼
        │                              /it/seller/onboarding
        │                                              │
        │                         wizard 7 steps → Pubblica
        ▼                                              ▼
   public listing                         /it/seller/listings
   /it/listings/{slug}                              │
        │                         ┌─────────────────┼─────────────────┐
        │                         ▼                 ▼                 ▼
   buyer: Prenota visita    Verifica titolarità   Documenti      Richieste
   buyer: Invia messaggio   /verification         /documents     /enquiries
        │                         └─────────────────┬─────────────────┘
        ▼                                           ▼
   seller confirms on                    /it/seller/viewings
   /it/seller/viewings                   (+ /availability on the listing)
```

### Beat A — Discover (public)

- **URL:** `https://easycasaita.com/it/vendi-da-privato`  
- **H1:** «Vendi casa da solo — senza venderti a sconto.»  
- **Lead:** «Pubblica un annuncio vero, visto da acquirenti veri. Niente esclusiva, niente incarico.»  
- **CTA:** «Crea il tuo annuncio gratis» → `/it/add`  
- Page then lists five “come funziona” steps (see honesty gaps in §4).

### Beat B — Sign in

- No custom registration form. Nav / wizard button: **«Accedi»** (OIDC).  
- Unauthenticated wizard: «Accedi per pubblicare».

### Beat C — Onboarding (first time only)

- **URL:** `/it/seller/onboarding`  
- **Title:** «Completa il profilo venditore»  
- Seller fills: **Nome visualizzato**, optional **Telefono**, optional marketing tick.  
- Submit **«Continua con l'annuncio»** records informativa v1.1.  
- Then the wizard opens.

### Beat D — Publish (the real wizard)

- **URL:** `/it/seller/list`  
- Nav label: **«Pubblica annuncio»**  
- Chrome: «Passo {n} di {total}» · **Indietro** · **Avanti** · last step **Pubblica**

| Passo | IT label | Seller enters |
|------|----------|---------------|
| 1 | Tipo e titolo | Tipologia + Titolo |
| 2 | Indirizzo | Indirizzo, Città, Provincia (sigla), CAP |
| 3 | Dettagli | Mq, Locali, Bagni |
| 4 | Prezzo | Prezzo (€) |
| 5 | Foto | URL foto, min. 3 (paste URLs — not a camera upload on this path) |
| 6 | Descrizione | testo, min. 40 caratteri |
| 7 | Revisione | checkbox «Confermo di essere il proprietario / avente diritto…» → **Pubblica** |

Success: «Annuncio pubblicato» → **Vedi annuncio** or **Gestisci i tuoi annunci**.

**OMI is not a wizard step.** The marketing line «inserisci l'indirizzo e precompiliamo il contesto di mercato» is **not what the wizard UI does**. Address is typed; there is no OMI panel in the wizard. OMI appears later (Beat G / analytics).

### Beat E — Seller home

- **URL:** `/it/seller/listings`  
- **Title:** «I miei annunci»  
- Top nav (IT): **Pubblica annuncio · I miei annunci · Richieste · Visite**  
- Per card: title, city, price, **Pubblicato / Bozza / Non pubblicato**, link **Vedi pagina pubblica**, plus **Verifica titolarità** and **Documenti annuncio**.  
- Optional paid (do not lead the film with these): **In evidenza — 7 / 30 giorni** (flat fee), Premium on `/it/account`.

### Beat F — Prove genuineness (optional, not a publish gate)

- **Verifica titolarità** → `/it/seller/listings/{id}/verification`  
  Seller types intestatari from the visura, uploads files. States: Non verificato → Documenti inviati → In revisione → Titolarità verificata.  
  Public chip: **Proprietario Verificato**.  
  Meaning in live copy: documents received + name matched. **Not required to publish.**
- **Documenti annuncio** → `/it/seller/listings/{id}/documents`  
  Slots: APE, Planimetria catastale, Visura catastale, Atto di provenienza.  
  Score on the card: «Documentazione {have}/{total}». Files stay private (moderation only).

### Beat G — What buyers see (so the seller understands the loop)

- **URL:** `/it/listings/{slug}`  
- Tabs include **Dettagli · Descrizione · Valutazione immobile · Posizione · Contatta**  
- Side actions: **Prenota visita**, **Invia messaggio**  
- **Fasce OMI** (P2, live) live here on **Valutazione immobile** (and later on seller analytics) — official Agenzia delle Entrate zone band next to the asking price. Phrase as **published data**, never «ti consigliamo di chiedere X».  
- Buyer books → seller sees it under **Visite**. Buyer writes → seller sees it under **Richieste**.

### Beat H — Richieste

- **URL:** `/it/seller/enquiries`  
- Nav: **Richieste**  
- Seller marks read / opens the thread.  
- **Acquirente verificato (Banks4All) is IN ARRIVO** on the marketing ledger (P4). Do not say buyers already arrive with a live financial badge. Inbox itself is built; the badge product is not live.

### Beat I — Visite

- Seller publishes slots at `/it/seller/listings/{id}/availability` («Disponibilità visite») — weekly windows, capacity; open house if capacity > 1.  
- Buyer hits **Prenota visita** on the listing.  
- Seller conducts on `/it/seller/viewings` («Visite da condurre»): **Conferma** / **Rifiuta** on requested, then Confermata / Completata / Annullata / Assente.  
- Nav shows **Visite**. Availability is a deep link from the listing tools, not a top-nav item.

### Beat J — Andamento (optional, live, sparse)

- `/it/seller/listings/{id}/analytics` — «Andamento dell'annuncio»  
- Counts: Visualizzazioni, Salvataggi, Richieste, Tasso richieste, Giorni in vendita.  
- Nudges are labelled **osservazioni**, not instructions. Do not script “abbassa il prezzo”.

---

## 3. Live vs coming vs hidden (honesty ledger)

From `promises.json` + the live `/it/vendi-da-privato` page:

| ID | State | What it is | Script rule |
|----|-------|------------|-------------|
| P2 Fasce OMI | **Attivo** | Official zone band on the listing / analytics | Show after publish, not inside the wizard |
| P3 Proprietario verificato | **Attivo** | Visura in, name match; optional | Say it is optional |
| P4 Acquirenti verificati | **In arrivo** | Banks4All badge on enquiries | Label coming, or skip |
| P5 Agenda visite | **Attivo** | Slots + confirm | Core beat |
| P6 Checklist documenti | **Attivo** | APE / planimetria / visura / atto | Optional beat |
| P7 Dashboard venditore | **Attivo** | Analytics | Optional, short |
| P1 savings / P8 | **Hidden** | Retracted EC-S-34 | Do not use |
| Claim 1 € figures | **Hidden** | Retracted | No “risparmi €X vs agenzia” |
| Claim 2 mediazione hero | **Hidden** | Retracted on this page | Do not open with “non siamo mediatori” |

Marketing “come funziona” step **Pubblica in pochi minuti** is chipped **In arrivo** on the live page even though the wizard works. For the film, treat publish as **live** (it is). Do not repeat the false “precompiliamo il contesto di mercato” line.

---

## 4. Where the v0 film drifted from the website

Cursor cut an 88s branded-slide film from marketing copy. Use this as negative space:

1. It said the wizard pre-fills market context. **The wizard does not show OMI.** Seller types address/city/CAP; OMI shows on the public listing valuation tab and on analytics.  
2. It implied a single “five steps” product story. **The seller actually does: Accedi → profilo → 7 wizard steps → I miei annunci → (optional) visura/docs → richieste/visite.**  
3. Photos were shown as a polished form. **This path asks for photo URLs (min. 3), not a phone camera roll.** Do not promise “scatta e carica” unless we change the product.  
4. Buyer badge was labelled in arrivo (good). Keep that.  
5. Slides were brand cards, not the real UI. **Prefer a script that can be shot on the real screens** listed above (demo host `demo.easycasaita.com` if you want a safe capture).  
6. Voice was Italian neural TTS (Isabella). Replaceable once you lock copy.

---

## 5. Legal floor for the script (non-negotiable)

T04 engineering rule 2: tools are things **the seller does** («pubblichi», «carichi», «confermi»). Never «EasyCasa trova l’acquirente / chiude / negozia».

**Refuse in the script:**

- T04 rows **10–12**: offerte, *proposta d'acquisto*, *caparra*, negotiation advice  
- Any fee as **% of sale** or contingent on sale (boost/premium are flat and optional — if mentioned, say tariffa fissa)  
- **sanabilità** or a legal-risk conclusion  
- Price advice («dovresti chiedere X», «sopra/sotto mercato» as a verdict)  
- EasyCasa solvency claims (Banks4All badge is third-party and **coming**)  
- Retracted Claim 1 euro savings slider  
- Retracted Claim 2 consumer line that EasyCasa «non svolge mediazione» as the hero claim (ledger hidden on this page; `CLAUDE.md` §1.2 REA question is open)

**Safe lines already on the site:**

- Niente esclusiva, niente incarico  
- Crea il tuo annuncio gratis  
- Fascia OMI = dato pubblicato dall’Agenzia delle Entrate  
- Badge VO = documenti arrivati e nome coincidente; non obbligatorio per pubblicare  
- Visite: pubblichi gli slot, confermi le richieste  
- Documenti: restano privati, solo moderazione

---

## 6. Suggested film spine (you may tighten)

Keep it to what a seller can click without a private demo account if possible; mark [AUTH] beats that need a signed-in capture.

1. `/it/vendi-da-privato` — hero + CTA (8s)  
2. Accedi (3s) [AUTH]  
3. Onboarding nome → Continua con l'annuncio (6s) [AUTH]  
4. Wizard: tipo → indirizzo → dettagli → prezzo → foto → descrizione → Pubblica (25–30s) [AUTH]  
5. Public listing: what a buyer sees + OMI on Valutazione immobile (10s)  
6. I miei annunci + optional Verifica titolarità (8s) [AUTH]  
7. Richieste (inbox exists; badge **in arrivo**) (6s) [AUTH]  
8. Visite: slot + Conferma (10s) [AUTH]  
9. CTA back to «Crea il tuo annuncio gratis» (5s)

If you cut to 45s: 1, 4, 5, 8, 9 only.

---

## 7. Repo / stack notes for your next brief

- Next.js 14, next-intl IT/EN/ES, seller shell under `/{locale}/seller/*`  
- Promise ledger: `apps/web/src/config/sell-privately/promises.json`  
- Wizard steps (code): `basics, address, details, price, photos, description, review`  
- SOP: `docs/runbooks/seller-dashboard.md`  
- v0 film + generator (ignore for copy): `scripts/seller-intro-video/`  
- Cursor will regenerate the MP4 from your script; keep scene IDs stable if you can

---

## 8. Blocked / needs Aziz

- A signed-in **demo seller** on `demo.easycasaita.com` if you want Cursor to screen-capture real UI instead of slides  
- Product call: mention boost/premium or keep the intro free-path only (recommend free-path only)

---

*Derived from the live page + seller UI in repo on 2026-09-08. Not legal advice. Script must stay inside T04 + EC-S-34.*
