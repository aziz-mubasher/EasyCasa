---
audit_id: EC-AYNI-AUDIT-1
commit: 3cc5099b28061751f0c35f365652bee198845f59
date: 2026-09-07
author: Cursor (bc-bb45221b-baea-4a36-a15c-841c443a0bb0)
venture: EasyCasa
scope: censimento. Nessuna modifica di comportamento o di copy.
---

# EC-AYNI-AUDIT-1 — Censimento del perimetro regolamentare

Documento descrittivo. Zero proposte. Dove manca una formulazione giuridica operativa: `[[BUCO]]`.
Baseline git: `origin/main` @ `3cc5099`. Conteggio produzione: query `psql` su `easycasa-ita-db-1` il 2026-09-07. Conteggio stringhe: `rg` / parser JSON, non stime.

**EC-AYNI-1 non è stato aperto.** Questo file lo blocca.

---

## 1. Otto asserzioni — conferma o smentita

| # | Esito | Riferimento |
|---|---|---|
| 1 | **Parzialmente vera.** `brand.tagline` contiene le tre frasi citate. `home.subtitle` **non esiste**. `home.hero.subtitle` è un altro testo (proprietario verificato / «dal venditore non prendiamo un euro»). | `apps/web/messages/it.json:26` `brand.tagline` = `Compra, vendi e affitta — paghi solo i servizi che usi, con un'agenzia regolare.` · `en.json:26` `from a licensed agency.` · `es.json:26` `con una agencia regulada.` · `home.hero.subtitle` `it.json:93` |
| 2 | **Parzialmente vera.** `pricing.disclosure` annuncia provvigione e mediatori abilitati. `footer.disclosure` **non esiste**. Il footer ha `entity`, `blurb` («senza provvigione per il venditore»), link `legal.mediation`. | `it.json:688` `pricing.disclosure` · `it.json:639–684` namespace `footer` |
| 3 | **Vera nel codice TypeScript; non nel DB di produzione.** `apps/api/src/service-catalog/domain/catalog.ts` contiene `FULL_MEDIATION` e `BUYER_MEDIATION` con `priceModel: 'provvigione'`, `ratePercent: 0.0249`, più `OFFER_DRAFTING` `eur(99)`, `VIEWING_ACCOMPANIMENT` `eur(49)`, `ROGITO_COORDINATION` `eur(250)`. `ServiceCatalogService.listItems()` serve **questa costante**, non la tabella. In produzione `service_catalog_items` ha **solo 3 righe**: `BUYER_MEDIATION`, `OFFER_DRAFTING`, `VIEWING_ACCOMPANIMENT`. | `catalog.ts:91–138` · query 2026-09-07 |
| 4 | **Vera.** `migration/sql/0016_phase24.sql:40–45` inserisce le tre voci con `legal_basis = 'mediazione'`. `migration/sql/0009_phase10.sql` aveva default `review_required`. `docs/phase-10.md:13` descrive il fail-safe `REVIEW_REQUIRED`. Nessun commento nella 0016 cita un legale. | `0016_phase24.sql` · `0009_phase10.sql:7` · `docs/phase-10.md` |
| 5 | **Vera.** | `apps/api/src/fascicolo/domain/document-types.ts:19–24` `APE` `gates: { PUBLISH: 'required', REGISTER_LEASE: 'required', CLOSE: 'required' }` |
| 6 | **Vera.** `energy_performance_kwh_m2_y` è nullable (`0014_phase21.sql:5`). `energy_class` è nullable da `0002_core.sql:80`. `listingRowToPin` in `apps/api/src/alerts/listing-pin.ts:34–44` restituisce `energyClass: null` se assente o non in enum. In produzione: **118** annunci `published`, **0** senza `energy_class`, **118** senza `energy_performance_kwh_m2_y`. | query 2026-09-07 |
| 7 | **Parzialmente vera.** Esistono `featuredPlacements` e `plans`/`memberships`. Il prezzo **non è €2/giorno**. Il boost T26 è forfettario: **990 centesimi / 7 giorni** e **2490 / 30 giorni** (`packages/shared/src/listing-boost/listingBoost.ts:10–13`). Checkout: `POST` featured in `apps/api/src/billing/stripe.service.ts`. `PAYMENTS_ENABLED=true` sul VPS. In produzione: `featured_placements=0`, `listing_boost=0`, `memberships=1`, `plans=6`. | VPS `.env` (solo flag) · query |
| 8 | **Falsa.** `docs/legal/` **è tracciato su `main`**. 15 path in `git ls-tree origin/main docs/legal`, incluso `T04_mediazione_boundary.md` (primo commit su main `c74916d` 2026-08-10), `mediation-disclosure.md` (live copy da `b88ec82` 2026-08-13), `COUNSEL-REVIEW-PACKAGE.md`, `aste-counsel-addendum-lgl1.md`. Non è una working copy locale. La copia letta da fuori era incompleta o non allineata a `main`. | `git ls-files docs/legal/` @ `3cc5099` |

`CLAUDE.md` è tracciato su `main` (`git ls-files CLAUDE.md` lo trova). È ancora la **v1 · 25 August 2026** (entità Mundida). La costituzione v2 del 7 settembre 2026 **non è in questo PR** (un solo documento nuovo). `Ayni` compare **0** volte nel repo.

---

## 2. Censimento 1 — stringhe che affermano un perimetro

**Metodo:** parser JSON su `apps/web/messages/{it,en,es}.json` e `apps/mobile/src/i18n/locales/**`, più le label di `catalog.ts` (servite da `GET /service-catalog` e renderizzate su `/[locale]/pricing`) e il blocco live di `docs/legal/mediation-disclosure.md` (enquiry). Pattern: mediazion/mediation/mediación, provvigione/comisión, «agenzia regolare»/licensed/regulada, «non svolge»/portale, proposta/incarico/L. 39, 2,49%. Esclusi toponimi (`comuni.json` «Rea», «Incarico») e i pacchetti counsel/T04 (non raggiungono un utente di prodotto; conteggio a parte).

**Sorgenti spazzolate e esito:**

| Sorgente | Esito |
|---|---|
| `apps/web/messages/{it,en,es}.json` incluso `meta` | Incluso. `meta.home.title` it: «EasyCasa — Annunci verificati, nessuna provvigione»; `meta.pricing.description` nega la percentuale sul prezzo di vendita. |
| `apps/mobile/src/i18n/locales/**` | Incluso (owner/pro). |
| `apps/admin/**` | Nessuna stringa operatore che affermi perimetro. Unico hit: regex di divieto in `whatsapp-operator-templates.test.ts` (`proposta\|caparra\|provvigione`). |
| `infra/keycloak/themes/easycasa/**` | Nessuna stringa di mediazione/provvigione. Identità in §4. |
| Pagine legali web | Route reali: `/[locale]/legal/privacy`, `/[locale]/legal/terms`, `/[locale]/legal/mediation` (+ alias `/termini`, `/mediazione-e-provvigione`). **Non esiste** `/cookie` né namespace `cookie`. Copy da `privacyPolicy` / `termsConditions` / `mediationPage`. |
| `docs/legal/**` | Incluso solo il blocco enquiry di `mediation-disclosure.md` (raggiunge l'utente). T04 e counsel packet: **non in tabella** — 15 file tracciati, uso interno. |
| Template mandato / email / PDF | Nessun template incarico con testo di perimetro trovato fuori dal catalogo/mandate status machine. Email Keycloak: identità §4. |
| JSON-LD / sitemap / robots | `packages/shared/src/structured-data/structuredData.ts` `EASY_CASA_PROVIDER.legalName='MUNDIDA S.r.l.'` `taxID='IT04531990986'` — identità §4, non perimetro. `apps/web/app/robots.ts`, `sitemap.ts`: nessuno status regolamentare. |
| EC Consult / EL Assist | Nessuna knowledge base nel repo (`**/*kb*` = 0). Journey WhatsApp (`whatsapp-journey.ts`) presenta Easy Legenda come lettura del fascicolo, senza «mediazione»/«provvigione». |
| Store metadata app | Nessun file store (App Store / Play) nel repo. |
| Hardcoded UI | `catalog.ts` label/code; form enquiry usa i18n. |

### Totali

| | n |
|---|---:|
| Stringhe censite (tabella sotto) | **293** |
| False oggi (`vera in PONTE?` = `no`) | **20** |
| Vere oggi e false al mese 12 (`sì` / `no`) | **9** |
| Vere in entrambi gli stati (`sì` / `sì`) | **0** |
| `dipende da una decisione aperta` su almeno una colonna | **273** |

`true_both = 0` è un risultato: nessuna stringa di questa lista è contemporaneamente vera in PONTE e vera al mese 12 sotto le regole di classificazione sotto.

**Regole usate per le due colonne (non sono pareri giuridici):**

- Afferma abilitazione/iscrizione («agenzia regolare», «licensed agency», «mediatori abilitati») → PONTE `no`, mese 12 `sì` (orizzonte dichiarato nel brief).
- Nega l'attività di mediazione / «opera come portale» → PONTE `sì`, mese 12 `no`.
- Nega provvigione/percentuale dal venditore → PONTE `sì`, mese 12 `dipende da una decisione aperta` (art. 1755 c.c. diventa disponibile solo se la società è iscritta **e** sceglie di incassare).
- Offre o prezza un atto riservato / una provvigione di catalogo → PONTE `no`, mese 12 `sì`.
- Parla di mediazione/provvigione in generale (pagina informativa L. 39, usi CCIAA, «quando è dovuta») senza dire cosa è EasyCasa → `dipende da una decisione aperta` / `dipende da una decisione aperta`.

**Dove `dipende`, in una riga:** la colonna mese 12 per le negazioni di provvigione dipende dalla **strada** (flag fino al mese 12 vs patentino + incasso). La colonna su testi informativi dipende da se, al mese 12, la pagina resta «noi non siamo mediatori» o diventa «noi lo siamo».

T04 / counsel (fuori tabella, non raggiungono l'utente di prodotto): `rg` su `docs/legal/T04_mediazione_boundary.md` + `COUNSEL-*.md` + `counsel-*.md` + addendum aste = materiale interno tracciato.


| # | percorso | riga | locale | stringa esatta | cosa afferma | vera in PONTE? | vera al mese 12? |
|---|---|---:|---|---|---|---|---|
| 1 | `apps/web/messages/it.json` | 18 | it | Il listino dei servizi EasyCasa. Paghi solo i servizi che usi — tariffe fisse, senza percentuale sul prezzo di vendita. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 2 | `apps/web/messages/it.json` | 26 | it | Compra, vendi e affitta — paghi solo i servizi che usi, con un'agenzia regolare. | afferma abilitazione / iscrizione | no | sì |
| 3 | `apps/web/messages/it.json` | 86 | it | EasyCasa — Annunci verificati, nessuna provvigione | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 4 | `apps/web/messages/it.json` | 87 | it | Il portale immobiliare italiano senza provvigione dal venditore. Ogni annuncio ha un proprietario verificato, ogni prezzo accanto ai valori ufficiali dell’Agenzia delle Entrate. Valutazione gratuita, senza registrazione. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 5 | `apps/web/messages/it.json` | 88 | it | Ogni annuncio verificato. Nessuna provvigione. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 6 | `apps/web/messages/it.json` | 88 | it | Nessuna provvigione. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 7 | `apps/web/messages/it.json` | 107 | it | Provvigioni da entrambe le parti | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 8 | `apps/web/messages/it.json` | 133 | it | Nessuna provvigione dal venditore | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 9 | `apps/web/messages/it.json` | 140 | it | Chi guadagna solo se firmi l’incarico ha interesse a prometterti un prezzo che il mercato non pagherà. Poi, dopo tre mesi senza visite, arriva la telefonata sul ribasso. Noi non prendiamo provvigione sulla vendita. No… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 10 | `apps/web/messages/it.json` | 348 | it | Annuncio immobiliare a {city} su EasyCasa — proprietario verificabile, senza provvigione dal venditore. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 11 | `apps/web/messages/it.json` | 400 | it | disclosure di mediazione e provvigione | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 12 | `apps/web/messages/it.json` | 407 | it | Prendi visione della disclosure di mediazione per continuare. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 13 | `apps/web/messages/it.json` | 642 | it | EasyCasa è il portale immobiliare italiano senza provvigione per il venditore. Ogni annuncio ha un proprietario verificato. Ogni valutazione poggia sui dati ufficiali dell’Agenzia delle Entrate. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 14 | `apps/web/messages/it.json` | 664 | it | Redazione della proposta | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 15 | `apps/web/messages/it.json` | 670 | it | Mediazione | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 16 | `apps/web/messages/it.json` | 688 | it | Se ci incarichi come mediatori abilitati, può applicarsi una provvigione a conclusione dell'affare — sempre indicata nell'incarico prima della firma. | afferma abilitazione / iscrizione | no | sì |
| 17 | `apps/web/messages/it.json` | 695 | it | Dettagli su mediazione e provvigione: | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 18 | `apps/web/messages/it.json` | 696 | it | informativa mediazione | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 19 | `apps/web/messages/it.json` | 710 | it | Confronto indicativo per un venditore tipico: servizi à la carte + mediazione solo a conclusione dell'affare. Regola il valore dell'immobile per vedere la stima. | offre o prezza un atto riservato / una provvigione | no | sì |
| 20 | `apps/web/messages/it.json` | 716 | it | EasyCasa (à la carte + mediazione a conclusione) | offre o prezza un atto riservato / una provvigione | no | sì |
| 21 | `apps/web/messages/it.json` | 719 | it | Stima totale se l'affare si conclude (include mediazione stimata) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 22 | `apps/web/messages/it.json` | 720 | it | La mediazione matura solo a conclusione dell'affare ed è sempre indicata nell'incarico. | offre o prezza un atto riservato / una provvigione | no | sì |
| 23 | `apps/web/messages/it.json` | 729 | it | Pubblicazione, fascicolo, media e mediazione solo se chiudi l'affare. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 24 | `apps/web/messages/it.json` | 733 | it | Visite, proposta e mediazione lato acquirente quando serve. | offre o prezza un atto riservato / una provvigione | no | sì |
| 25 | `apps/web/messages/it.json` | 742 | it | Bundle sui servizi a prezzo fisso; provvigioni e riaddebiti restano come in catalogo. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 26 | `apps/web/messages/it.json` | 745 | it | Eventuali provvigioni a conclusione non sono incluse nel prezzo bundle. | offre o prezza un atto riservato / una provvigione | no | sì |
| 27 | `apps/web/messages/it.json` | 765 | it | Totale stimato (con mediazione) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 28 | `apps/web/messages/it.json` | 775 | it | Provvigione e riaddebiti non sono addebitati online. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 29 | `apps/web/messages/it.json` | 776 | it | In modalità test puoi pagare online i servizi a tariffa fissa; la mediazione resta su preventivo. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 30 | `apps/web/messages/it.json` | 913 | it | Supporto a tariffa fissa per acquirenti esteri che comprano in Italia. Visure, contratti, notaio e rogito — in italiano, inglese o spagnolo. Nessuna provvigione sul prezzo. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 31 | `apps/web/messages/it.json` | 939 | it | Nessuna provvigione sul prezzo di acquisto. Tariffa fissa, concordata in anticipo. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 32 | `apps/web/messages/it.json` | 975 | it | Compenso concordato per iscritto prima di iniziare, come richiesto per l'incarico di mediazione (art. 6, L. 39/1989). | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 33 | `apps/web/messages/it.json` | 1027 | it | Proposta d'acquisto | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 34 | `apps/web/messages/it.json` | 1115 | it | Sulla provvigione | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 35 | `apps/web/messages/it.json` | 1119 | it | Nessuna legge italiana fissa un minimo di provvigione — l'Antitrust nel 2004 ha confermato che le tariffe non si applicano al settore, e l'art. 6 della L. 39/1989 lascia la misura all'accordo delle parti. Il 3% è l'us… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 36 | `apps/web/messages/it.json` | 1163 | it | No. In Italia non esiste un minimo legale di provvigione. Le misure sono liberamente negoziabili. Il 3% che senti citare è l'uso delle Camere di commercio e vale come residuale solo se le parti non hanno pattuito null… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 37 | `apps/web/messages/it.json` | 1267 | it | Valutazione gratuita basata sui valori ufficiali dell'Agenzia delle Entrate per la tua microzona. Nessun agente ti richiama. Nessuna provvigione. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 38 | `apps/web/messages/it.json` | 1272 | it | Valutazione gratuita — nessuna provvigione dal venditore | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 39 | `apps/web/messages/it.json` | 1278 | it | Il valore della tua casa secondo i dati ufficiali dell'Agenzia delle Entrate per la tua microzona. Non secondo chi vuole l'incarico. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 40 | `apps/web/messages/it.json` | 1281 | it | Nessuna provvigione, mai, dal venditore. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 41 | `apps/web/messages/it.json` | 1298 | it | Stiamo collegando indirizzo → microzona OMI per le bande in tempo reale. I tuoi dati restano tuoi; puoi già pubblicare senza provvigione dal venditore. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 42 | `apps/web/messages/it.json` | 1299 | it | Pubblica senza provvigione | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 43 | `apps/web/messages/it.json` | 1304 | it | In Italia il modo più semplice per ottenere un incarico è promettere un prezzo che il mercato non pagherà. Poi, dopo tre mesi senza visite, arriva la telefonata sul ribasso. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 44 | `apps/web/messages/it.json` | 1313 | it | Partiamo dai valori che l'Agenzia delle Entrate registra per la tua microzona, e ti mostriamo ogni elemento del calcolo. Non prendiamo provvigione dal venditore, quindi non abbiamo motivo di gonfiarlo. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 45 | `apps/web/messages/it.json` | 1356 | it | Puoi tenerlo e basta — per decidere, per discutere con chi ti ha dato una cifra diversa, o per capire se conviene aspettare. Se invece vuoi vendere, pubblichi qui senza provvigione. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 46 | `apps/web/messages/it.json` | 1374 | it | Dai servizi che scegli, non dalla vendita. Fotografie, certificazione energetica, verifica dei documenti, assistenza alla trattativa: ognuno ha un prezzo fisso, indicato prima dell'ordine, uguale su una casa da 150.00… | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 47 | `apps/web/messages/it.json` | 1593 | it | Conferma delle basi giuridiche, descrizione dell'interesse legittimo e del relativo bilanciamento, riferimenti alle norme antiriciclaggio applicabili all'attività di mediazione. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 48 | `apps/web/messages/it.json` | 1828 | it | Mediazione immobiliare | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 49 | `apps/web/messages/it.json` | 1851 | it | Questa non è mediazione: non raccogliamo offerte, non redigiamo proposte e non consigliamo un prezzo. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 50 | `apps/web/messages/it.json` | 1919 | it | Servizi a pagamento e provvigioni | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 51 | `apps/web/messages/it.json` | 1945 | it | EasyCasa è una piattaforma gestita da MUNDIDA S.r.l. dove proprietari e acquirenti si trovano direttamente. Dal venditore non prendiamo provvigione. Offriamo inoltre servizi a prezzo fisso che puoi scegliere liberamente. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 52 | `apps/web/messages/it.json` | 1947 | it | Identificazione completa della società, estremi di iscrizione per l'attività di mediazione immobiliare ai sensi della L. 39/1989, ambito territoriale, estremi della polizza R.C. professionale. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 53 | `apps/web/messages/it.json` | 1953 | it | Verifichiamo quello che possiamo verificare e ti diciamo apertamente cosa resta non verificato. Dove svolgiamo attività di mediazione, lo indichiamo nel relativo incarico scritto. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 54 | `apps/web/messages/it.json` | 1955 | it | Delimitazione del ruolo di hosting provider rispetto a quello di mediatore, coordinamento con gli obblighi del Digital Services Act per le piattaforme online (punto di contatto, procedura di notice-and-action, motivaz… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 55 | `apps/web/messages/it.json` | 1985 | it | Dove è prevista una provvigione di mediazione, l'importo è concordato per iscritto nell'incarico prima di qualsiasi attività, e matura solo alla conclusione dell'affare. | offre o prezza un atto riservato / una provvigione | no | sì |
| 56 | `apps/web/messages/it.json` | 1987 | it | Voce prioritaria del batch legale (A2). Conferma che nessuna norma fissa una provvigione minima; disciplina dell'incarico di mediazione con indicazione obbligatoria della misura; momento di maturazione del diritto ex … | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 57 | `apps/web/messages/it.json` | 2017 | it | Se non basta, come consumatore puoi rivolgerti agli organismi di mediazione o alla piattaforma europea ODR. Non sei obbligato a passare da noi per primi. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 58 | `apps/web/messages/it.json` | 2018 | it | Indicazione dell'organismo ADR eventualmente aderente, link ODR obbligatorio, coordinamento con la mediazione civile obbligatoria per le controversie in materia di contratti immobiliari. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 59 | `apps/web/messages/it.json` | 2035 | it | Mediazione e provvigione — EasyCasa | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 60 | `apps/web/messages/it.json` | 2036 | it | Nessuna legge italiana fissa una provvigione minima. Cosa dice davvero la norma, da dove arriva il 3% e cosa controllare prima di firmare un incarico. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 61 | `apps/web/messages/it.json` | 2035 | it | Mediazione e provvigione | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 62 | `apps/web/messages/it.json` | 2040 | it | Se ti hanno detto che la provvigione minima è fissata per legge, ti hanno detto una cosa falsa. Ecco cosa dice davvero la norma. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 63 | `apps/web/messages/it.json` | 2044 | it | L'attività di mediazione immobiliare è disciplinata dalla legge 39 del 1989. Sulla misura della provvigione, l'articolo 6 dice una cosa sola: è stabilita dalle parti. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 64 | `apps/web/messages/it.json` | 2047 | it | L. 39/1989, art. 6 — la provvigione è stabilita dalle parti | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 65 | `apps/web/messages/it.json` | 2063 | it | Il silenzio non gioca a tuo favore. Un incarico che non indica la misura della provvigione può essere ricondotto agli usi locali — cioè, in molte province, proprio a quel 3% da entrambe le parti. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 66 | `apps/web/messages/it.json` | 0 | it | Non firmare mai un incarico con la percentuale in bianco, "da concordare" o rinviata a un allegato che non hai letto. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 67 | `apps/web/messages/it.json` | 2068 | it | Quando la provvigione è dovuta | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 68 | `apps/web/messages/it.json` | 2069 | it | Non alla firma dell'incarico, e non quando arriva un potenziale acquirente. Il diritto matura con la | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 69 | `apps/web/messages/it.json` | 2076 | it | EasyCasa non prende provvigione dal venditore. Su questo non ci sono condizioni, soglie o eccezioni. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 70 | `apps/web/messages/it.json` | 2079 | it | Provvigione dal venditore sul prezzo di vendita | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 71 | `apps/web/messages/it.json` | 2100 | it | EasyCasa, sul percorso vendi-da-privato, opera come portale: non svolge mediazione e non matura una provvigione sul prezzo di vendita. I servizi opzionali restano a tariffa fissa, indicata prima dell'ordine. | nega l'attività di mediazione | sì | no |
| 72 | `apps/web/messages/it.json` | 2104 | it | Vale per qualsiasi incarico, non solo per il nostro. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 73 | `apps/web/messages/it.json` | 2130 | it | Perché non abbiamo nulla da perderci. Non guadagniamo una percentuale sul prezzo di vendita, quindi non abbiamo motivo di lasciarti credere che il 3% sia obbligatorio. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 74 | `apps/web/messages/it.json` | 2143 | it | Attività di mediazione immobiliare — iscrizione | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 75 | `apps/web/messages/it.json` | 2146 | it | Banks4All ed EasyCasa sono società distinte del gruppo Mundida. Banks4All non percepisce compensi da EasyCasa, da agenzie o da venditori. La mediazione creditizia è svolta da operatori iscritti negli albi obbligatori. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 76 | `apps/web/messages/it.json` | 2154 | it | Come guadagna EasyCasa, chi ci paga e chi no. Nessuna provvigione dal venditore, prezzi fissi indicati prima dell'ordine. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 77 | `apps/web/messages/it.json` | 2167 | it | Non prendiamo una percentuale sul prezzo di vendita. Mai, in nessuna forma. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 78 | `apps/web/messages/it.json` | 2146 | it | La mediazione creditizia è svolta da operatori iscritti negli albi obbligatori. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 79 | `apps/web/messages/it.json` | 2239 | it | Chi guadagna solo se firmi l'incarico ha interesse a prometterti un prezzo alto. Noi no, quindi partiamo dai valori ufficiali dell'Agenzia delle Entrate e ti mostriamo il calcolo. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 80 | `apps/web/messages/it.json` | 2276 | it | La mediazione creditizia non è svolta da Banks4All ma da operatori iscritti negli albi obbligatori. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 81 | `apps/web/messages/it.json` | 2302 | it | Mediazione e provvigione → | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 82 | `apps/web/messages/it.json` | 2316 | it | EasyCasa è il portale italiano dove ogni annuncio è verificato e ogni agenzia è identificata. Durante il programma pilota pubblicare è gratuito: nessun abbonamento, nessun rinnovo automatico, nessun vincolo. La tua pr… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 83 | `apps/web/messages/it.json` | 2354 | it | Ogni agenzia è verificata (P.IVA e numero REA visibili), ogni annuncio dichiara un incarico reale, i duplicati vengono bloccati. I tuoi annunci non competono con gli annunci fantasma. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 84 | `apps/web/messages/it.json` | 2390 | it | Pubblichi solo immobili per cui hai un incarico reale. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 85 | `apps/web/messages/it.json` | 2392 | it | Ritiri l'annuncio entro 5 giorni da vendita o revoca dell'incarico. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 86 | `apps/web/messages/it.json` | 2447 | it | Banks4All è il partner per la valutazione di sostenibilità della compra. Qui trovi i link principali — senza mescolare i servizi EasyCasa con la mediazione creditizia. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 87 | `apps/web/messages/it.json` | 2490 | it | La mediazione creditizia è svolta da operatori iscritti negli albi obbligatori, non da EasyCasa. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 88 | `apps/web/messages/it.json` | 2502 | it | EasyCasa ti mette in contatto diretto con proprietari privati in tutta Italia — con dati ufficiali di mercato, controparti verificate e visite che prenoti come un tavolo al ristorante. Niente agenzia in mezzo. Niente … | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 89 | `apps/web/messages/it.json` | 2504 | it | provvigione tipica a carico dell’acquirente evitata su un acquisto da €250.000 | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 90 | `apps/web/messages/it.json` | 2522 | it | Tratti direttamente con il proprietario. Non c’è provvigione a tuo carico — i soldi che andrebbero all’intermediazione restano per la ristrutturazione, i mobili, la tua vita. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 91 | `apps/web/messages/it.json` | 2616 | it | Provvigione a carico acquirente su casa da €250.000 | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 92 | `apps/web/messages/it.json` | 2658 | it | Stima basata su una provvigione d’uso del 3% + IVA sul prezzo di acquisto. La legge italiana non fissa un minimo di commissione; le tariffe sono liberamente negoziabili e variano per agenzia e territorio. Il risparmio… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 93 | `apps/web/messages/it.json` | 2667 | it | EasyCasa e Banks4All fanno parte del gruppo Mundida (P.IVA IT04531990986). I servizi di finanziamento Banks4All sono forniti da una società sorella di EasyCasa nello stesso gruppo. EasyCasa è una piattaforma che colle… | nega l'attività di mediazione | sì | no |
| 94 | `apps/web/messages/it.json` | 2771 | it | Pubblica il tuo immobile su EasyCasa gratis — senza provvigione, senza esclusiva, senza incarico. Gli strumenti del privato: acquirenti verificati, agenda visite e contesto di mercato onesto. | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 95 | `apps/web/messages/it.json` | 2782 | it | Annuncio privato gratuito — nessuna provvigione sul prezzo di vendita | nega compenso % / provvigione dal venditore | sì | dipende da una decisione aperta |
| 96 | `apps/web/messages/it.json` | 2791 | it | EasyCasa dà ai privati gli strumenti di un'agenzia, senza la provvigione. Niente costi, niente esclusiva, niente incarico. Solo un annuncio vero, visto da acquirenti veri. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 97 | `apps/web/messages/it.json` | 2801 | it | La legge italiana non fissa un minimo di provvigione; le tariffe d'uso variano per provincia (rif. AGCM provv. 13035/2004). | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 98 | `apps/web/messages/it.json` | 2803 | it | Stima della provvigione d'uso sul tuo lato: | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 99 | `apps/web/messages/it.json` | 2806 | it | Su EasyCasa annuncio, richieste e strumenti per le visite sono gratis per chi vende da privato. I servizi opzionali hanno un prezzo separato — mai una percentuale sul prezzo di vendita. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 100 | `apps/web/messages/it.json` | 2840 | it | Zero provvigione | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 101 | `apps/web/messages/it.json` | 2886 | it | Annuncio, richieste e strumenti per le visite sono gratis. EasyCasa guadagna da servizi opzionali a pagamento che scegli tu — mai una percentuale sul prezzo di vendita. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 102 | `apps/web/messages/it.json` | 2916 | it | Crea un annuncio gratis. Niente costi, niente esclusiva, niente incarico. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 103 | `apps/web/messages/it.json` | 3557 | it | Le voci contrassegnate «Gestito da EasyCasa» sono desk pilota interni EasyCasa, non professionisti terzi indipendenti. L'elenco resta informativo — nessuna commissione sull'incarico. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 104 | `apps/web/messages/it.json` | 3558 | it | Alcuni professionisti pagano una tariffa fissa per comparire in evidenza nell'elenco. EasyCasa non intermedia e non riceve commissioni sull'incarico con il professionista. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 105 | `apps/web/messages/it.json` | 3574 | it | EasyCasa è un portale informativo — non intermedia l'incarico con i professionisti e non matura commissioni. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 106 | `apps/web/messages/it.json` | 3625 | it | EasyCasa è un portale che mette in contatto privati acquirenti e venditori. Non svolgiamo attività di mediazione e non maturiamo provvigione sul prezzo di vendita. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 107 | `apps/web/messages/it.json` | 3685 | it | EasyCasa non agisce come mediatore e non applica commissioni sul prezzo di vendita. Gli abbonamenti sono a tariffa fissa e mostrati nel checkout sicuro. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 108 | `apps/web/messages/it.json` | 3710 | it | Carica documenti di proprietà per la verifica anti-frode dell'annuncio. EasyCasa è un portale — non effettuiamo perizie legali né mediazione. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 109 | `apps/web/messages/it.json` | 3732 | it | EasyCasa non agisce come mediatore. I documenti servono solo alla verifica dell'annuncio. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 110 | `apps/web/messages/en.json` | 6 | en | Search homes across every Italian region. Pay only for the services you use: à la carte tools to buy, sell and let, with no percentage of the sale. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 111 | `apps/web/messages/en.json` | 18 | en | The EasyCasa service price list. Pay only for the services you use — fixed fees, with no percentage of the sale price. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 112 | `apps/web/messages/en.json` | 26 | en | Buy, sell, and rent — pay only for the services you use, from a licensed agency. | afferma abilitazione / iscrizione | no | sì |
| 113 | `apps/web/messages/en.json` | 400 | en | mediation and commission disclosure | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 114 | `apps/web/messages/en.json` | 407 | en | Acknowledge the mediation disclosure to continue. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 115 | `apps/web/messages/en.json` | 670 | en | Mediation | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 116 | `apps/web/messages/en.json` | 688 | en | When you instruct us as a licensed mediator, a provvigione may apply on successful conclusion — always disclosed in the incarico before you sign. | afferma abilitazione / iscrizione | no | sì |
| 117 | `apps/web/messages/en.json` | 695 | en | Mediation and provvigione details: | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 118 | `apps/web/messages/en.json` | 407 | en | mediation disclosure | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 119 | `apps/web/messages/en.json` | 710 | en | Indicative comparison for a typical seller: à la carte services plus mediation only if the deal closes. Adjust the property value to update the estimate. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 120 | `apps/web/messages/en.json` | 716 | en | EasyCasa (à la carte + mediation on closing) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 121 | `apps/web/messages/en.json` | 719 | en | Estimated total if the deal closes (includes estimated mediation) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 122 | `apps/web/messages/en.json` | 720 | en | Mediation applies only when the deal closes and is always stated in the mandate. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 123 | `apps/web/messages/en.json` | 729 | en | Listing, dossier, media, and mediation only if you close. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 124 | `apps/web/messages/en.json` | 733 | en | Viewings, offers, and buyer-side mediation when you need them. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 125 | `apps/web/messages/en.json` | 742 | en | Fixed-price service bundles; provvigione and pass-through items follow the catalog. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 126 | `apps/web/messages/en.json` | 745 | en | Any closing mediation fee is not included in the bundle price. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 127 | `apps/web/messages/en.json` | 765 | en | Estimated total (incl. mediation) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 128 | `apps/web/messages/en.json` | 775 | en | Provvigione and pass-through items are not charged online. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 129 | `apps/web/messages/en.json` | 776 | en | Fixed-fee services can be paid online in test mode; mediation fees stay quote-only. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 130 | `apps/web/messages/en.json` | 975 | en | Rate agreed in writing before any work begins, as required for a mediation mandate under art. 6, L. 39/1989. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 131 | `apps/web/messages/en.json` | 1027 | en | Proposta d'acquisto | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 132 | `apps/web/messages/en.json` | 1119 | en | No Italian law sets a minimum commission — the Antitrust authority confirmed in 2004 that tariffs do not apply to this sector, and art. 6 of L. 39/1989 leaves the rate to agreement between the parties. The 3% figure i… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 133 | `apps/web/messages/en.json` | 1593 | en | Confirmation of legal bases, description of legitimate interest and the related balancing test, references to anti-money-laundering rules applicable to mediation activities. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 134 | `apps/web/messages/en.json` | 1828 | en | Estate mediation | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 135 | `apps/web/messages/en.json` | 1947 | en | Full company identification, registration details for estate mediation under Italian Law 39/1989, territorial scope, professional liability insurance details. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 136 | `apps/web/messages/en.json` | 1953 | en | We verify what we can verify and tell you plainly what remains unverified. Where we act as mediators, we say so in the written mandate. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 137 | `apps/web/messages/en.json` | 1955 | en | Boundary between hosting provider and mediator roles; Digital Services Act duties for online platforms (contact point, notice-and-action, statement of reasons for removals); applicability of small-business exemptions. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 138 | `apps/web/messages/en.json` | 1985 | en | Where a mediation commission applies, the amount is agreed in writing in the mandate before any activity, and becomes due only when the deal closes. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 139 | `apps/web/messages/en.json` | 1987 | en | Priority legal-batch item (A2). Confirm no statutory minimum commission; mediation mandate rules with mandatory fee disclosure; when the right accrues under Art. 1755 Italian Civil Code; advance expenses; VAT. Also ch… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 140 | `apps/web/messages/en.json` | 2017 | en | If that is not enough, as a consumer you can turn to mediation bodies or the European ODR platform. You are not required to come to us first. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 141 | `apps/web/messages/en.json` | 2018 | en | Any ADR body we join, mandatory ODR link, coordination with compulsory civil mediation for property-contract disputes. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 142 | `apps/web/messages/en.json` | 2035 | en | Mediation and commission — EasyCasa | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 143 | `apps/web/messages/en.json` | 2036 | en | No Italian law sets a minimum mediation fee. What the rules actually say, where the 3% comes from, and what to check before you sign a mandate. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 144 | `apps/web/messages/en.json` | 2035 | en | Mediation and commission | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 145 | `apps/web/messages/en.json` | 2044 | en | Estate mediation is governed by Law 39 of 1989. On the amount of the commission, Article 6 says only one thing: it is set by the parties. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 146 | `apps/web/messages/en.json` | 2047 | en | L. 39/1989, art. 6 — the commission is set by the parties | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 147 | `apps/web/messages/en.json` | 2100 | en | On the sell-privately path EasyCasa operates as a portal: it does not perform real-estate mediation and does not earn a commission on the sale price. Optional services stay flat-fee, shown before you order. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 148 | `apps/web/messages/en.json` | 2130 | en | Because we have nothing to lose by it. We do not earn a percentage of the sale price, so we have no reason to let you believe 3% is mandatory. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 149 | `apps/web/messages/en.json` | 2143 | en | Estate mediation activity — registration | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 150 | `apps/web/messages/en.json` | 2146 | en | Banks4All and EasyCasa are separate companies in the Mundida group. Banks4All does not receive fees from EasyCasa, agencies or sellers. Credit mediation is carried out by operators registered in the mandatory registers. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 151 | `apps/web/messages/en.json` | 2167 | en | We do not take a percentage of the sale price. Ever, in any form. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 152 | `apps/web/messages/en.json` | 2146 | en | Credit mediation is carried out by operators registered in the mandatory registers. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 153 | `apps/web/messages/en.json` | 2276 | en | Credit mediation is not carried out by Banks4All but by operators registered in the mandatory registers. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 154 | `apps/web/messages/en.json` | 2302 | en | Mediation and commission → | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 155 | `apps/web/messages/en.json` | 2522 | en | You deal directly with the owner. There is no agency fee on your side of the transaction — the money that would normally go to intermediation stays in your renovation budget, your furniture, your life. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 156 | `apps/web/messages/en.json` | 2667 | en | EasyCasa and Banks4All are part of the Mundida group (P.IVA IT04531990986). Banks4All financing services are provided by a sister company of EasyCasa within the same group. EasyCasa is a platform connecting private bu… | nega l'attività di mediazione | sì | no |
| 157 | `apps/web/messages/en.json` | 3625 | en | EasyCasa is a listing portal connecting private buyers and sellers. We do not act as a mediator and do not charge a commission on the sale price. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 158 | `apps/web/messages/en.json` | 3685 | en | EasyCasa does not act as a mediator and does not charge a commission on the sale price. Subscription fees are flat and shown in secure checkout. | nega l'attività di mediazione | sì | no |
| 159 | `apps/web/messages/en.json` | 3732 | en | EasyCasa does not act as a mediator. Documents are used for listing verification only. | nega l'attività di mediazione | sì | no |
| 160 | `apps/web/messages/es.json` | 26 | es | Compra, vende y alquila — paga solo por los servicios que usas, con una agencia regulada. | afferma abilitazione / iscrizione | no | sì |
| 161 | `apps/web/messages/es.json` | 86 | es | EasyCasa — Anuncios verificados, sin comisión al vendedor | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 162 | `apps/web/messages/es.json` | 87 | es | El portal inmobiliario italiano sin comisión del vendedor. Cada anuncio tiene un propietario verificado; cada precio junto a las bandas oficiales de la Agenzia delle Entrate. Valoración gratuita, sin registro. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 163 | `apps/web/messages/es.json` | 88 | es | Cada anuncio verificado. Sin comisión al vendedor. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 164 | `apps/web/messages/es.json` | 88 | es | Sin comisión al vendedor. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 165 | `apps/web/messages/es.json` | 107 | es | Comisión por las dos partes | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 166 | `apps/web/messages/es.json` | 133 | es | Sin comisión del vendedor | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 167 | `apps/web/messages/es.json` | 140 | es | Quien solo gana si firmas el encargo tiene interés en prometerte un precio que el mercado no pagará. Luego, tras tres meses sin visitas, llega la llamada del rebaje. Nosotros no cobramos comisión sobre la venta. No te… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 168 | `apps/web/messages/es.json` | 348 | es | Anuncio inmobiliario en {city} en EasyCasa — propietario verificable, sin comisión del vendedor. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 169 | `apps/web/messages/es.json` | 400 | es | información sobre mediación y comisión | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 170 | `apps/web/messages/es.json` | 407 | es | Confirma la información de mediación para continuar. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 171 | `apps/web/messages/es.json` | 642 | es | EasyCasa es el portal inmobiliario italiano sin comisión para el vendedor. Cada anuncio tiene un propietario verificado. Cada valoración se apoya en datos oficiales de la Agenzia delle Entrate. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 172 | `apps/web/messages/es.json` | 670 | es | Mediación | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 173 | `apps/web/messages/es.json` | 688 | es | Si nos encargas como mediadores habilitados, puede aplicarse una provvigione al concluir la operación — siempre indicada en el mandato antes de firmar. | afferma abilitazione / iscrizione | no | sì |
| 174 | `apps/web/messages/es.json` | 695 | es | Detalles de mediación y provvigione: | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 175 | `apps/web/messages/es.json` | 407 | es | información de mediación | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 176 | `apps/web/messages/es.json` | 710 | es | Comparación orientativa para un vendedor tipo: servicios à la carte más mediación solo si cierra la operación. Ajusta el valor del inmueble. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 177 | `apps/web/messages/es.json` | 716 | es | EasyCasa (à la carte + mediación al cierre) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 178 | `apps/web/messages/es.json` | 719 | es | Total estimado si cierra la operación (incl. mediación estimada) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 179 | `apps/web/messages/es.json` | 720 | es | La mediación solo aplica al cierre y figura siempre en el mandato. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 180 | `apps/web/messages/es.json` | 729 | es | Publicación, expediente, media y mediación solo si cierras. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 181 | `apps/web/messages/es.json` | 733 | es | Visitas, oferta y mediación comprador cuando lo necesites. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 182 | `apps/web/messages/es.json` | 742 | es | Paquetes de servicios a precio fijo; la provvigione y los costes repercutidos siguen el catálogo. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 183 | `apps/web/messages/es.json` | 745 | es | La provvigione al cierre no está incluida en el precio del paquete. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 184 | `apps/web/messages/es.json` | 765 | es | Total estimado (con mediación) | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 185 | `apps/web/messages/es.json` | 775 | es | Comisión y repercusión no se cobran online. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 186 | `apps/web/messages/es.json` | 776 | es | En modo test puedes pagar online servicios de tarifa fija; la mediación sigue en presupuesto. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 187 | `apps/web/messages/es.json` | 822 | es | Vende, compra o alquila casas y habitaciones sin comisiones de agencia | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 188 | `apps/web/messages/es.json` | 913 | es | Apoyo a tarifa fija para compradores extranjeros en Italia. Visuras, contratos, notario y escritura — en inglés, italiano o español. Sin comisión sobre el precio. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 189 | `apps/web/messages/es.json` | 939 | es | Sin comisión sobre el precio de compra. Tarifa fija, acordada por adelantado. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 190 | `apps/web/messages/es.json` | 975 | es | Tarifa acordada por escrito antes de empezar, como exige el mandato de mediación (art. 6, L. 39/1989). | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 191 | `apps/web/messages/es.json` | 1027 | es | Proposta d'acquisto | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 192 | `apps/web/messages/es.json` | 1115 | es | Sobre la comisión | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 193 | `apps/web/messages/es.json` | 1119 | es | Ninguna ley italiana fija un mínimo de comisión — la Autoridad de Competencia confirmó en 2004 que las tarifas no aplican al sector, y el art. 6 de la L. 39/1989 deja la medida al acuerdo de las partes. El 3% es el us… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 194 | `apps/web/messages/es.json` | 1163 | es | No. En Italia no hay mínimo legal de comisión. Las tarifas son negociables desde la liberalización del sector. El 3% que oyes es el uso de las Cámaras de Comercio y solo aplica si las partes no acordaron nada por escr… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 195 | `apps/web/messages/es.json` | 1267 | es | Valoración gratuita basada en los valores oficiales de la Agenzia delle Entrate para tu microzona. Ningún agente te llama. Sin comisión del vendedor. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 196 | `apps/web/messages/es.json` | 1272 | es | Valoración gratuita — sin comisión del vendedor | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 197 | `apps/web/messages/es.json` | 1281 | es | Sin comisión del vendedor, nunca. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 198 | `apps/web/messages/es.json` | 1298 | es | Estamos conectando dirección → microzona OMI para bandas en vivo. Tus datos son tuyos; ya puedes publicar sin comisión del vendedor. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 199 | `apps/web/messages/es.json` | 1299 | es | Publicar sin comisión | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 200 | `apps/web/messages/es.json` | 1313 | es | Partimos de los valores que registra la Agenzia delle Entrate para tu microzona y mostramos cada parte del cálculo. No cobramos comisión al vendedor, así que no tenemos motivo para inflarlo. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 201 | `apps/web/messages/es.json` | 1356 | es | Puedes quedártelo — para decidir, contrastar otra cifra, o esperar. Si quieres vender, publicas aquí sin comisión. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 202 | `apps/web/messages/es.json` | 1364 | es | Publica sin comisión | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 203 | `apps/web/messages/es.json` | 1374 | es | Con los servicios que eliges, no con la venta. Fotografía, certificado energético, comprobación de documentos, apoyo en la negociación: cada uno tiene precio fijo, indicado antes del pedido, igual en una casa de 150.0… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 204 | `apps/web/messages/es.json` | 1593 | es | Confirmación de las bases jurídicas, descripción del interés legítimo y de la correspondiente ponderación, referencias a las normas antiblanqueo aplicables a la actividad de mediación. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 205 | `apps/web/messages/es.json` | 1828 | es | Mediación inmobiliaria | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 206 | `apps/web/messages/es.json` | 1851 | es | Esto no es mediación: no recogemos ofertas, no redactamos propuestas ni recomendamos un precio. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 207 | `apps/web/messages/es.json` | 1919 | es | Servicios de pago y comisiones | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 208 | `apps/web/messages/es.json` | 1945 | es | EasyCasa es una plataforma gestionada por MUNDIDA S.r.l. donde propietarios y compradores se encuentran directamente. Al vendedor no le cobramos comisión. Ofrecemos además servicios a precio fijo que puedes elegir lib… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 209 | `apps/web/messages/es.json` | 1947 | es | Identificación completa de la sociedad, datos de inscripción para la mediación inmobiliaria conforme a la L. 39/1989 italiana, ámbito territorial, datos de la póliza de responsabilidad civil profesional. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 210 | `apps/web/messages/es.json` | 1953 | es | Verificamos lo que podemos verificar y te decimos abiertamente qué queda sin verificar. Donde ejercemos mediación, lo indicamos en el mandato escrito. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 211 | `apps/web/messages/es.json` | 1955 | es | Delimitación del rol de hosting provider frente al de mediador; obligaciones del Digital Services Act para plataformas en línea; exenciones para pequeñas empresas. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 212 | `apps/web/messages/es.json` | 1985 | es | Donde haya una comisión de mediación, el importe se acuerda por escrito en el mandato antes de cualquier actividad, y solo nace al concluirse el negocio. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 213 | `apps/web/messages/es.json` | 1987 | es | Prioridad del lote legal (A2). Confirmar que ninguna norma fija una comisión mínima; mandato de mediación con indicación obligatoria de la cuantía; momento de nacimiento del derecho ex art. 1755 c.c. italiano; gastos … | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 214 | `apps/web/messages/es.json` | 2017 | es | Si no basta, como consumidor puedes acudir a organismos de mediación o a la plataforma europea ODR. No estás obligado a pasar primero por nosotros. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 215 | `apps/web/messages/es.json` | 2018 | es | Indicación del organismo ADR eventualmente adherido, enlace ODR obligatorio, coordinación con la mediación civil obligatoria en contratos inmobiliarios. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 216 | `apps/web/messages/es.json` | 2035 | es | Mediación y comisión — EasyCasa | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 217 | `apps/web/messages/es.json` | 2036 | es | Ninguna ley italiana fija una comisión mínima. Qué dice realmente la norma, de dónde sale el 3% y qué comprobar antes de firmar un mandato. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 218 | `apps/web/messages/es.json` | 2035 | es | Mediación y comisión | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 219 | `apps/web/messages/es.json` | 2040 | es | Si te dijeron que la comisión mínima está fijada por ley, te dijeron algo falso. Aquí está lo que dice realmente la norma. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 220 | `apps/web/messages/es.json` | 2044 | es | La mediación inmobiliaria se rige por la ley 39 de 1989. Sobre la cuantía de la comisión, el artículo 6 dice una sola cosa: la establecen las partes. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 221 | `apps/web/messages/es.json` | 2047 | es | L. 39/1989, art. 6 — la comisión la establecen las partes | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 222 | `apps/web/messages/es.json` | 2063 | es | El silencio no juega a tu favor. Un mandato que no indica la cuantía de la comisión puede remitirse a los usos locales — es decir, en muchas provincias, exactamente ese 3% de ambas partes. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 223 | `apps/web/messages/es.json` | 2068 | es | Cuándo se debe la comisión | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 224 | `apps/web/messages/es.json` | 2076 | es | EasyCasa no cobra comisión al vendedor. En esto no hay condiciones, umbrales ni excepciones. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 225 | `apps/web/messages/es.json` | 2079 | es | Comisión al vendedor sobre el precio de venta | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 226 | `apps/web/messages/es.json` | 2100 | es | En el recorrido vender-entre-particulares EasyCasa opera como portal: no realiza mediación inmobiliaria y no cobra comisión sobre el precio de venta. Los servicios opcionales siguen siendo a tarifa fija, indicada ante… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 227 | `apps/web/messages/es.json` | 2143 | es | Actividad de mediación inmobiliaria — inscripción | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 228 | `apps/web/messages/es.json` | 2146 | es | Banks4All y EasyCasa son sociedades distintas del grupo Mundida. Banks4All no percibe honorarios de EasyCasa, de agencias ni de vendedores. La mediación crediticia la realizan operadores inscritos en los registros obl… | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 229 | `apps/web/messages/es.json` | 2154 | es | Cómo gana EasyCasa, quién nos paga y quién no. Sin comisión al vendedor, precios fijos indicados antes del pedido. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 230 | `apps/web/messages/es.json` | 2165 | es | Ninguna comisión al vendedor | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 231 | `apps/web/messages/es.json` | 2146 | es | La mediación crediticia la realizan operadores inscritos en los registros obligatorios. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 232 | `apps/web/messages/es.json` | 2192 | es | Si un sujeto no aparece en esta lista, no nos abona dinero de ninguna forma — ni comisiones, ni retrocesiones, ni honorarios indirectos. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 233 | `apps/web/messages/es.json` | 2276 | es | La mediación crediticia no la realiza Banks4All sino operadores inscritos en los registros obligatorios. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 234 | `apps/web/messages/es.json` | 2302 | es | Mediación y comisión → | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 235 | `apps/web/messages/es.json` | 2316 | es | EasyCasa es el portal italiano donde cada anuncio está verificado y cada agencia está identificada. Durante el piloto publicar es gratis: sin suscripción, sin renovación automática, sin exclusividad. Tu comisión sigue… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 236 | `apps/web/messages/es.json` | 2447 | es | Banks4All es el socio para la evaluación de asequibilidad de la compra. Aquí están los enlaces principales — sin mezclar los servicios EasyCasa con la mediación crediticia. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 237 | `apps/web/messages/es.json` | 2490 | es | La mediación crediticia la realizan operadores inscritos en los registros obligatorios, no EasyCasa. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 238 | `apps/web/messages/es.json` | 2495 | es | Para compradores — EasyCasa · Compra directo. Quédate la comisión. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 239 | `apps/web/messages/es.json` | 2496 | es | Compra directamente a particulares en Italia — cero comisión de comprador, control de precio OMI, visitas estructuradas. Gratis para compradores. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 240 | `apps/web/messages/es.json` | 2495 | es | Quédate la comisión. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 241 | `apps/web/messages/es.json` | 2515 | es | Todo en esta página es gratis para compradores. EasyCasa nunca te cobra comisión — ese es el punto de la plataforma, no una promoción. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 242 | `apps/web/messages/es.json` | 2521 | es | Cero comisión de comprador | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 243 | `apps/web/messages/es.json` | 2522 | es | Tratas directamente con el propietario. No hay honorario de agencia a tu cargo — el dinero que iría a la intermediación se queda en tu reforma, tus muebles, tu vida. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 244 | `apps/web/messages/es.json` | 2556 | es | Un marketplace sin comisión solo funciona si cada anuncio es real. Por eso los vendedores se ganan su sitio. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 245 | `apps/web/messages/es.json` | 2658 | es | Estimación basada en un honorario habitual del 3% + IVA sobre el precio de compra. La ley italiana no fija un mínimo de comisión; las tarifas son negociables y varían por agencia y zona. El ahorro real depende de la t… | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 246 | `apps/web/messages/es.json` | 2667 | es | EasyCasa y Banks4All forman parte del grupo Mundida (P.IVA IT04531990986). Los servicios de financiación de Banks4All los presta una empresa hermana de EasyCasa dentro del mismo grupo. EasyCasa es una plataforma que c… | nega l'attività di mediazione | sì | no |
| 247 | `apps/web/messages/es.json` | 2676 | es | Compraventa directa en Italia sin comisión del vendedor. Anuncios con identidad verificada, valores OMI oficiales y servicios a precio fijo. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 248 | `apps/web/messages/es.json` | 2680 | es | Compraventa directa, sin comisiones. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 249 | `apps/web/messages/es.json` | 2700 | es | El vendedor no paga comisión. Fotos profesionales, certificado energético (APE), verificación de documentos, asistencia: cada servicio tiene un precio fijo indicado antes de contratarlo. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 250 | `apps/web/messages/es.json` | 2771 | es | Publica tu vivienda en EasyCasa gratis — sin comisión, sin exclusividad, sin mandato. Herramientas para particulares: compradores verificados, agenda de visitas y contexto de mercado honesto. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 251 | `apps/web/messages/es.json` | 2782 | es | Anuncio particular gratuito — sin comisión sobre el precio de venta | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 252 | `apps/web/messages/es.json` | 2791 | es | EasyCasa da a los particulares las herramientas de una agencia, sin la comisión. Sin tasas, sin exclusividad, sin contrato. Solo un anuncio genuino, visto por compradores genuinos. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 253 | `apps/web/messages/es.json` | 2801 | es | La ley italiana no fija una comisión mínima; las tarifas habituales varían por provincia (rif. AGCM provv. 13035/2004). | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 254 | `apps/web/messages/es.json` | 2803 | es | Comisión habitual estimada de tu lado: | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 255 | `apps/web/messages/es.json` | 2521 | es | Cero comisión | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 256 | `apps/web/messages/es.json` | 3553 | es | Lista informativa — sin comisión | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 257 | `apps/web/messages/es.json` | 3557 | es | Las entradas marcadas «Gestionado por EasyCasa» son mesas piloto internas de EasyCasa, no profesionales terceros independientes. El listado sigue siendo informativo — sin comisión sobre el encargo. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 258 | `apps/web/messages/es.json` | 3558 | es | Algunos profesionales pagan una tarifa fija por aparecer destacados. EasyCasa no intermedia ni cobra comisión por el encargo con el profesional. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 259 | `apps/web/messages/es.json` | 3560 | es | Profesionales seleccionados por provincia. Contacto directo; EasyCasa no intermedia ni cobra comisión. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 260 | `apps/web/messages/es.json` | 3574 | es | EasyCasa es un portal informativo — no intermediamos el encargo con los profesionales ni cobramos comisión. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 261 | `apps/web/messages/es.json` | 3625 | es | EasyCasa es un portal que conecta compradores y vendedores particulares. No actuamos como mediadores ni cobramos comisión sobre el precio de venta. | afferma abilitazione / iscrizione | no | sì |
| 262 | `apps/web/messages/es.json` | 3685 | es | EasyCasa no actúa como mediador ni cobra comisión sobre el precio de venta. Las suscripciones son tarifa fija y se muestran en el checkout seguro. | nega l'attività di mediazione | sì | no |
| 263 | `apps/web/messages/es.json` | 3687 | es | Premium aumenta tus límites de anuncios y subidas. Los importes aparecen en el checkout seguro — sin comisión sobre la venta. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 264 | `apps/web/messages/es.json` | 3710 | es | Sube documentos de propiedad para la revisión antifraude del anuncio. EasyCasa es un portal — no ofrecemos asesoramiento legal ni mediación. | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 265 | `apps/web/messages/es.json` | 3732 | es | EasyCasa no actúa como mediador. Los documentos sirven solo para verificar el anuncio. | nega l'attività di mediazione | sì | no |
| 266 | `apps/web/messages/es.json` | 3780 | es | Plano actualizado de la unidad. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 267 | `apps/mobile/src/i18n/locales/owner.it.json` | 35 | it | In attesa di revisione legale — l'incarico non può essere inviato finché ogni servizio non è classificato. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 268 | `apps/mobile/src/i18n/locales/owner.it.json` | 39 | it | Conferma i servizi per creare l'ordine, pagare quanto dovuto ora e firmare l'incarico. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 269 | `apps/mobile/src/i18n/locales/owner.it.json` | 43 | it | Incarico in esclusiva | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 270 | `apps/mobile/src/i18n/locales/owner.it.json` | 44 | it | Crea incarico | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 271 | `apps/mobile/src/i18n/locales/owner.it.json` | 53 | it | {{rate}}% provvigione sulla vendita | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 272 | `apps/mobile/src/i18n/locales/owner.it.json` | 60 | it | La provvigione matura solo alla conclusione dell'affare. | offre o prezza un atto riservato / una provvigione | no | sì |
| 273 | `apps/mobile/src/i18n/locales/owner.es.json` | 0 | es | {{rate}}% de comisión sobre la venta | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 274 | `apps/mobile/src/i18n/locales/owner.es.json` | 0 | es | La comisión se devenga solo al cerrar la operación. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 275 | `apps/mobile/src/i18n/locales/pro.it.json` | 4 | it | Nessun incarico al momento. | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 276 | `apps/mobile/src/i18n/locales/pro.it.json` | 6 | it | Incarico | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 277 | `apps/api/src/service-catalog/domain/catalog.ts` | 91 | hardcoded | code: 'FULL_MEDIATION', | offre o prezza un atto riservato / una provvigione | no | sì |
| 278 | `apps/api/src/service-catalog/domain/catalog.ts` | 92 | hardcoded | labelEn: 'Full mediation (offer → close)', | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 279 | `apps/api/src/service-catalog/domain/catalog.ts` | 93 | hardcoded | labelIt: 'Mediazione completa (proposta → rogito)', | offre o prezza un atto riservato / una provvigione | no | sì |
| 280 | `apps/api/src/service-catalog/domain/catalog.ts` | 94 | hardcoded | labelEs: 'Mediación completa (oferta → escritura)', | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 281 | `apps/api/src/service-catalog/domain/catalog.ts` | 96 | hardcoded | priceModel: 'provvigione', | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 282 | `apps/api/src/service-catalog/domain/catalog.ts` | 102 | hardcoded | labelEn: 'Viewing accompaniment', | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 283 | `apps/api/src/service-catalog/domain/catalog.ts` | 103 | hardcoded | labelIt: 'Accompagnamento visita', | offre o prezza un atto riservato / una provvigione | no | sì |
| 284 | `apps/api/src/service-catalog/domain/catalog.ts` | 111 | hardcoded | code: 'BUYER_MEDIATION', | offre o prezza un atto riservato / una provvigione | no | sì |
| 285 | `apps/api/src/service-catalog/domain/catalog.ts` | 112 | hardcoded | labelEn: 'Buyer-side mediation', | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 286 | `apps/api/src/service-catalog/domain/catalog.ts` | 113 | hardcoded | labelIt: 'Mediazione lato acquirente', | offre o prezza un atto riservato / una provvigione | no | sì |
| 287 | `apps/api/src/service-catalog/domain/catalog.ts` | 114 | hardcoded | labelEs: 'Mediación del comprador', | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 288 | `apps/api/src/service-catalog/domain/catalog.ts` | 116 | hardcoded | priceModel: 'provvigione', | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 289 | `apps/api/src/service-catalog/domain/catalog.ts` | 122 | hardcoded | labelEn: 'Offer drafting', | implica un perimetro (incarico/proposta/percentuale) senza status esplicito | dipende da una decisione aperta | dipende da una decisione aperta |
| 290 | `apps/api/src/service-catalog/domain/catalog.ts` | 123 | hardcoded | labelIt: 'Redazione proposta di acquisto', | offre o prezza un atto riservato / una provvigione | no | sì |
| 291 | `docs/legal/mediation-disclosure.md` | 4 | it | > Aligns with T04 matrix (portal / no *mediazione* for private-seller hosting) and | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |
| 292 | `docs/legal/mediation-disclosure.md` | 15 | it | > EasyCasa opera come portale di pubblicazione annunci: non svolge attività di | nega l'attività di mediazione | sì | no |
| 293 | `docs/legal/mediation-disclosure.md` | 16 | it | > mediazione immobiliare su questa richiesta e non matura una **provvigione** sul | parla di mediazione/provvigione senza affermare lo status della società | dipende da una decisione aperta | dipende da una decisione aperta |


---

## 3. Censimento 2 — comportamenti che cambiano fra i tre stati

Flag `LicenceState`: **non esiste**. Nessun `PONTE` / `AGENTE_IMMOBILIARE` / `OAM` nel codice o nel DB. Spegnimento oggi = flag di feature esistenti o assenza di credenziale/coverage, non lo stato societario.

Produzione (2026-09-07): `PAYMENTS_ENABLED=true`, `ALLOW_PROVIDER_STUBS=false`, `ASTE_ANALYSIS_ENABLED=true`.

| Funzione | Ingresso | Flag esistente | Dato in DB | Raggiungibile oggi da utente non admin? | Righe reali | Cosa la spegnerebbe |
|---|---|---|---|---|---:|---|
| Pubblicazione annuncio terzi / owner | `GET /[locale]/add` → form richiede login → `POST /listings` + `POST /listings/:id/publish`. Seller wizard: `/[locale]/seller/list`. Casafari: import admin. | Nessuno di licenza. Auth Keycloak. | `listings` (`source`, `owner_user_id`, `agent_id`, `mediator_user_id`) | **Sì** (account). Publish non richiede APE-dato energetico (solo documento APE nel fascicolo se quel gate è invocato). | `native` 6 archived; `published` native **0**. `listing_draft` **0**. | **Niente, oggi non si spegne** per stato licenza. |
| Posizionamento a pagamento | `SellerBoostActions` → `POST` featured/boost in `stripe.service.ts`. Durate 7/30g. | `PAYMENTS_ENABLED` | `featured_placements`, `listing_boost` | **Sì** se autenticato seller e pagamenti on. | featured **0**, boost **0** | `PAYMENTS_ENABLED=false`. Nessun gate licenza. |
| Abbonamenti / plans | `GET /billing/plans`, membership Stripe | `PAYMENTS_ENABLED` | `plans` (6 chiavi: `free`,`basic`,`pro`,`agency`,`seller_premium`,`partner_directory_placement`), `memberships` | **Sì** (checkout membership) | memberships **1**, plans **6** | `PAYMENTS_ENABLED=false`. |
| Prenotazione visite | `/[locale]/listings/[slug]/book` (`BookViewingPicker`). Liste: `/viewings`, `/seller/viewings`. | Nessuno di licenza | `viewings`, `viewing_availability` | **Sì** (flusso pubblico di booking sulla listing) | viewings **1** | **Niente, oggi non si spegne.** |
| `VIEWING_ACCOMPANIMENT` | Catalogo pubblico `GET /service-catalog`, checkout `POST /service-catalog/checkout-orders` | `PAYMENTS_ENABLED`. Credential policy: **NONE** (non in `DEFAULT_CREDENTIAL_POLICY`) → `itemCoverageAvailability` **sempre available**. | `service_catalog_items` (riga seed 0016); ordini in `service_orders.item_codes` | **Sì**, fixed €49, acquistabile | catalog row 1; ordini con questo code **0** | `PAYMENTS_ENABLED=false`. Nessun gate REA. **Niente sul LicenceState.** |
| Custodia chiavi / accessi | — | — | — | **No** (nessun modulo/tabella trovati) | 0 | n/a |
| `OFFER_DRAFTING` | Stesso catalogo/checkout | `PAYMENTS_ENABLED`. Credential **NONE** → sempre available. T04 riga 11 vieta la proposta: il codice la vende. | come sopra | **Sì**, fixed €99 | catalog 1; ordini **0** | `PAYMENTS_ENABLED=false`. **Niente sul LicenceState.** |
| Percorso proposta → preliminare | Nessuna state machine «proposta accettata» oltre il catalogo e i task order | — | — | Catalogo sì; percorso completo **non trovato** come flusso unico | 0 | n/a |
| Mandato `MEDIAZIONE` | `POST /mandates` (`mandate.controller.ts`). `deriveMandate` in `legal-basis.ts` | Blocca l'invio se qualche item è `REVIEW_REQUIRED` o assente dalla mappa. **Non** guarda lo stato società. | `mandates.types[]`, `review_required_items[]` | API autenticata. In prod la mappa DB ha già `mediazione` sulle 3 voci 0016 → `canProceed` può essere true per quegli item. | mandates **0** | Un item `REVIEW_REQUIRED` blocca l'invio. **Niente, oggi non si spegne** per PONTE. |
| Voci `priceModel: 'provvigione'` | `CATALOG` TS: `FULL_MEDIATION`, `BUYER_MEDIATION`. Checkout: «provvigione/passthrough stay quote-only» (`service-catalog.controller.ts:133`). | `PAYMENTS_ENABLED` per checkout fixed; provvigione non entra nel due-now | `service_catalog_items.rate_percent` (solo `BUYER_MEDIATION` in DB) | Quotabili **sì** (GET catalog pubblico). Incasso provvigione: purpose enum `provvigione` su `payment_intents` esiste. | payment_intents **9** (non spezzati per purpose in questa query); ordini mediation **0** | Quote sempre visibile. Incasso: `PAYMENTS_ENABLED`. **Niente sul LicenceState.** |
| `FULL_MEDIATION` | Catalogo TS (non in DB prod). Checkout + coverage | `FULL_MEDIATION` → `REA_MEDIATORE`. Prod: credentials REA **0** (solo 3× `CENED_ACCREDITAMENTO`) → `assertOrderable` fallisce se si chiede provincia | solo in `catalog.ts` | Card **sì**. Ordine **bloccato** da coverage REA, non da licenza società. | 0 ordini | Assenza REA. **Niente sul LicenceState.** |
| `ROGITO_COORDINATION` | Catalogo TS | `NOTAIO` | non in DB prod | Card sì; ordine se c'è notaio in coverage | 0 | coverage. |
| Ordini acquirente (Phase 24) | enquiry → `service_orders.listing_id` | `PAYMENTS_ENABLED` | `enquiries` (9, status `NEW`: 2 `viewing` + 7 `info`), `service_orders` | Enquiry **sì**. Ordini catalogo autenticati **sì**. | orders **6** confirmed: 4× `{TENANT_SCREENING}` 5490, 2× `{DOC_CHECKUP}` 18178. Nessun code mediation. | **Niente sul LicenceState.** |
| AML/KYC alla firma mandato | `MandateService.onSignatureCompleted` → `aml.openForMandate` | Se `this.aml` è iniettato, parte. Catch solo log. | `kyc_cases` | Non dal pubblico; webhook firma. | kyc_cases **1**; mandates **0** (il caso KYC non è da mandato firmato in questa fotografia) | Togliere l'iniezione AML. **Niente sul LicenceState.** In PONTE il brief dice che non deve aprirsi: oggi **non si spegne**. |
| RLI come parte registrante | Catalogo `RLI_REGISTRATION`. `leases.registration_protocollo`. Adapter `RLI_CHANNEL_URL` | Seam vuoto se URL vuoto (health: rli `configured:false` sul probe precedente) | `leases` | Card catalogo sì. Registrazione telematica: solo se canale configurato. | leases **0** | URL vuoto = no-op. **Niente sul LicenceState.** |
| Gate `REA_MEDIATORE` | `DEFAULT_CREDENTIAL_POLICY`, `professionals` eligibility | Per-persona, non per-società | `credentials.type` | Admin assegna. Task FULL_MEDIATION. | credentials REA **0**; professionals **3** | Assenza credenziale. Società iscritta o no: **non letto**. |
| AVM / valutazione | `/[locale]` CTA «Quanto vale la mia casa»; `avm.controller.ts`; catalogo `VALUATION` «AVM + revisione agente» | Nessuno di licenza. T04 riga 3: no price recommendation — l'AVM esiste comunque. | `valuation_requests` | **Sì** (valutazione pubblica / form) | valuation_requests **0** | **Niente sul LicenceState.** Copy «valutazione» vs range OMI: `[[BUCO: se la UI live è range OMI o stima]]` — non classificato qui come parere. |
| Incasso dal venditore | Stripe checkout catalogo, boost, membership | `PAYMENTS_ENABLED` | `payment_intents` **9**, `invoices` **0** | **Sì** (pagamenti on) | 9 intent, 0 fatture | `PAYMENTS_ENABLED=false`. **Niente sul LicenceState.** |
| Incasso da agenzia | plan `agency`, partner directory `partner_directory_placement` | `PAYMENTS_ENABLED` | `plans`, `memberships` | **Sì** se il piano è esposto | 1 membership (non spezzata per key in questa query) | `PAYMENTS_ENABLED=false`. |

`deriveMandate` (`apps/api/src/transactions/domain/legal-basis.ts:26–44`): unico punto che già rifiuta l'invio su classificazione mancante. **Non** conosce `LicenceState`.

---

## 4. Censimento 3 — ogni punto che nomina un soggetto giuridico

Costante unica `LEGAL_ENTITY`: **non esiste**. I valori sono letterali duplicati o env.

| # | Punto | Valore letterale attuale | Origine |
|---|---|---|---|
| 1 | `.env.example` `EASYCASA_PIVA` | `IT00000000000` | letterale (placeholder) |
| 2 | `.env.example` `EASYCASA_DENOMINAZIONE` | `Easy Casa Ita Srl` | letterale |
| 3 | Commento `.env.example:289` | `Mundida S.r.l. · IT04531990986` | letterale (commento) |
| 4 | VPS `.env` `EASYCASA_PIVA` | placeholder `IT00000000000` (`placeholder=True`) | env, non allineato al footer |
| 5 | VPS `.env` `EASYCASA_DENOMINAZIONE` | `Easy Casa Ita Srl` | env |
| 6 | `apps/api/src/config/load.ts` default P.IVA | `IT00000000000` | letterale default Zod |
| 7 | `apps/api/src/config/load.ts` default denominazione | `Easy Casa Ita Srl` | letterale |
| 8 | `AGENCY_PUBLIC_NAME` default | `Easy Casa Italy` | letterale |
| 9 | Keycloak login `ecController` it | `Mundida S.r.l. · P.IVA IT04531990986 · Piazza Roma 8, 25030 Torbole Casaglia (BS)` | letterale `messages_it.properties:10` |
| 10 | Keycloak `ecLegalFooter` it | `Titolare del trattamento: Mundida S.r.l. …` | letterale |
| 11 | Keycloak `ecArt13Short` | Mundida + `IT04531990986` | letterale (it/en/es) |
| 12 | Keycloak email `messages_*.properties` | stessa P.IVA/denominazione | letterale, duplicato del login |
| 13 | Footer web `footer.entity` | `EasyCasa Italia · P.IVA IT04531990986` | letterale i18n ×3 |
| 14 | `privacyPolicy` / `termsConditions` / contatti `line1` / `legal` | `MUNDIDA S.r.l. (P.IVA IT04531990986)` e varianti | letterali i18n |
| 15 | `privacyPolicy` campo P.IVA | `IT04531990986` (`it.json:1800`) | letterale |
| 16 | JSON-LD `EASY_CASA_PROVIDER` | `legalName: 'MUNDIDA S.r.l.'`, `taxID: 'IT04531990986'` | letterale in `packages/shared/src/structured-data/structuredData.ts:68–73` |
| 17 | `docs/legal/mediation-disclosure.md` | non nomina P.IVA; ruolo «portale» | — |
| 18 | Template mandato | nessun PDF/HTML incarico con ragione sociale trovato | `[[BUCO: template mandato assente nel repo]]` |
| 19 | Stripe / SdI | `EASYCASA_*` per cedente; commento: «NOT the published controller identity» | env + commento |
| 20 | DPA hosting | `docs/legal/vendors/bunny-dpa-2026-08-15.pdf` citato Mundida↔BunnyWay | PDF tracciato |
| 21 | EC Consult / EL Assist | si presentano come EasyCasa / Easy Legenda, senza P.IVA | hardcoded journey |
| 22 | Store metadata | assente | — |
| 23 | `CLAUDE.md` v1 | `Mundida S.r.l. · P.IVA IT04531990986 · Brescia` | letterale |
| 24 | Gruppo / Banks4All | «società distinte del gruppo Mundida» in footer/trasparenza | letterali i18n |
| 25 | Ayni S.r.l. | **nessuna occorrenza** | — |

### Totali letterali (intero repo, `rg`, escluso `node_modules`)

| Token | Occorrenze | File distinti |
|---|---:|---:|
| `IT04531990986` | 64 | 33 |
| `IT00000000000` | 5 (4 file: `.env.example`, `load.ts`, `docs/runbooks/keycloak.md`, più audit) | 4 |
| `Mundida`/`MUNDIDA` (case-insensitive) | 219 | 74 |
| `Easy Casa Ita` | 20+ (mix docs/infra/config) | 16+ |
| `Ayni` | **0** | 0 |

Non esiste un titolare unico nel runtime: footer e Keycloak dicono Mundida+IT04531990986; env di fatturazione dice `Easy Casa Ita Srl`+`IT00000000000` anche sul VPS.

Ruoli doppi (titolare vs responsabile art. 28): i testi dicono «EasyCasa è gestita da MUNDIDA» e «Titolare del trattamento: Mundida». Ayni non è nominata. `[[BUCO: DPA Mundida-come-responsabile-per-Ayni — non esiste, Ayni non è nel repo]]`.

---

## 5. Mappa marketplace e costo delle due strade

### 5.1 Cos'è un «annuncio di terzi»

`listings.source` è il discriminatore presente. `wp_post_id` **non** va usato: 120/120 `demo` hanno `wp_post_id` valorizzato.

Query 2026-09-07, tabella `listings`, **180** righe:

| provenienza | come la riconosci in DB | righe | di cui `published` |
|---|---|---:|---:|
| importati ETL / legacy WordPress | `source = 'wordpress'` | 18 | 0 (tutti `archived`; `seller_type=private`) |
| pubblicati da un'agenzia terza (B2B) | `source = 'casafari' AND seller_type = 'agency'` | 30 | 0 (tutti `archived`) |
| Casafari marcati private (non `/add`) | `source = 'casafari' AND seller_type = 'private'` | 6 | 0 |
| pubblicati da un privato via `/add` | `source = 'native'` (unico valore nativo; 6 tutti `seller_type=private`, `archived`) | 6 | **0** |
| creati internamente / seed / demo | `source = 'demo'` | 120 | **118** (più 1 draft, 1 archived) |
| non classificabili | nessuna riga con `source` nullo o fuori da `{wordpress,casafari,native,demo}` | **0** | 0 |

`mediator_user_id` è **0** su tutte le 180. `agent_id` e `owner_user_id` sono valorizzati su 180/180 — non distinguono la provenienza.

L'inventario **live** (`published`) è interamente `demo` (118). Terzi e `/add` sono solo archivio.

APE negli published: classe presente su 118/118; `energy_performance_kwh_m2_y` **null su 118/118**.

### 5.2 Le due strade — costo ingegneristico

Il costo legale è nel brief. Qui solo superfici, non calendario.

**Strada 1 — riservato dietro flag fino al mese 12**

- Superfici stringa da accendere/spegnere insieme: **293** chiavi/righe della §2 (più T04/`mediation-disclosure` come documenti a scadenza, non in tabella).
- Capability da legare al flag (elenco §3): pubblicazione terzi, boost/featured, membership a pagamento su annunci, `VIEWING_ACCOMPANIMENT`, `OFFER_DRAFTING`, `FULL_MEDIATION`/`BUYER_MEDIATION`/qualunque `provvigione`, `POST /mandates`→`MEDIAZIONE`, checkout acquirente sui codici mediation, `onSignatureCompleted`→AML, RLI come parte registrante, incassi venditore/agenzia sui prodotti riservati.
- Flag oggi: **assente**. Spegnere senza flag = spegnere `PAYMENTS_ENABLED` (colpisce anche DOC_CHECKUP/TENANT_SCREENING già venduti: 6 ordini) oppure hard-code per codice catalogo.
- Rimozione di codice: 0 (come nel brief).
- Rischio regressione: alto sulle stringhe (contraddizione già live: `brand.tagline` «agenzia regolare» vs `mediationPage.ours.outro2` «opera come portale»). Lo scan deve lavorare su chiavi, non sul DOM (`text-transform: uppercase`).
- `[[BUCO: giorni-uomo]]` — questo censimento non stima calendari; l'ordine di grandezza è «un registro + un default PONTE + copy già in repo», non una riscrittura di dominio.

**Strada 2 — anticipare il patentino**

- Stesso registro e stesso flag; cambia il default di `enabledIn`, non l'architettura.
- In più, fuori codice: persona AML (D.lgs. 231/2007) — nel repo `kyc_cases` e `AmlModule` esistono, **non** un responsabile umano. `[[BUCO: nominativo soggetto obbligato]]`.
- Copy «agenzia regolare» diventa allineabile; copy «non svolge mediazione» diventa falsa (9 stringhe `sì/no` in §2).
- Iscrizione non sana il passato (brief): i 6 `service_orders` confirmed e i 9 `payment_intents` restano senza `licence_state_at_creation`.

**Punto comune:** il flag serve in entrambe. Oggi non c'è.

---

## 6. Cose che ho trovato e non ho toccato

Nessuna riga di `apps/`, `services/`, `packages/`, `migration/`, `infra/` è stata modificata.

| Trovato | Perché non toccato |
|---|---|
| `PAYMENTS_ENABLED=true` in produzione e `OFFER_DRAFTING` / `VIEWING_ACCOMPANIMENT` con credential `NONE` (acquistabili) | Censimento; spegnere sarebbe EC-AYNI-1 / atto umano |
| `legal_basis='mediazione'` sulle 3 voci 0016 in DB live | Stesso |
| `ASTE_ANALYSIS_ENABLED=true` sul VPS | Fuori perimetro licenza Ayni; G2/counsel; non flippato |
| Contraddizione live tagline «agenzia regolare» vs pagina mediazione «portale / non svolge» | Copy: vietato da questo brief |
| 118 published senza `energy_performance_kwh_m2_y` | PR APE è EC-AYNI-1 §5; decisione aperta su backfill |
| `EASYCASA_PIVA=IT00000000000` sul VPS vs footer IT04531990986 | Identità; PR LEGAL_ENTITY |
| `financing_needed` / `AffordThisHomeReferralBlock` | Fuori perimetro esplicito: altro PR, non segnalare come lavoro qui oltre questa riga |
| `CLAUDE.md` ancora v1 (Mundida) | Un solo documento nuovo in questo PR |
| Route cookie assente | Descritto, non creato |
| Knowledge base EC Consult assente | Descritto |

---

## 7. Commit e comandi usati per i numeri

```
git rev-parse origin/main
# 3cc5099b28061751f0c35f365652bee198845f59

git ls-tree -r --name-only origin/main docs/legal | wc -l
# 15

rg -c IT04531990986   # 64 occ / 33 file
rg -c -i Mundida      # 219 occ / 74 file
rg -c Ayni            # 0
```

Produzione:

```
SELECT source, status, count(*) FROM listings GROUP BY 1,2;
SELECT code, price_model, legal_basis FROM service_catalog_items;
-- + conteggi service_orders, mandates, enquiries, featured_placements,
--   listing_boost, memberships, viewings, kyc_cases, payment_intents,
--   credentials, valuation_requests, leases
```

