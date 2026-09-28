# EC-APP-1 — Censimento (PR 0)

**Data:** 28 settembre 2026  
**HEAD letto:** `e6342bc` (`fix: bump homepage sitemap lastmod after intro-video copy`)  
**Stato societario nel codice:** `CORPORATE_STATE = 'PONTE'` in `packages/shared/src/corporate-state.ts`.  
**Questo documento è sola lettura.** Non cambia l’app, l’API o il catalogo.

I quattro file di design citati dal brief **non sono nel repo**:

- `claude/AZM_EC_Seller_Contact_Shield_Design_v1.md`
- `claude/AZM_EC_Viewing_Organisation_Design_v1.md`
- `claude/AZM_EC_Sell_Privately_Redesign_v1.md`
- `claude/AZM_EC_Pricing_Final_Instructions_v1.md`

Nemmeno il canvas «Easy Casa Italia App». Il censimento descrive il codice. Non inventa il copy delle 16 schermate.

---

## 0. Segnalazione immediata — webhook pagamenti

Il brief chiede di fermarsi se l’API di produzione accetta un webhook non firmato. **Il codice non rifiuta sempre.**

`POST /payments/webhook` è `@Public()`. In `apps/api/src/payments/payments.controller.ts`:

- se `PAYMENTS_ENABLED` è vero, il corpo passa a `StripePaymentsWebhookHandler`, che rifiuta l’header `stripe-signature` assente o invalido;
- se `PAYMENTS_ENABLED` è falso, il corpo JSON `{ providerRef, type }` è accettato **senza firma** e `PaymentsService.handleWebhook` aggiorna l’intento.

Il default di boot è `PAYMENTS_ENABLED: bool(false)` in `apps/api/src/config/load.ts`. `docs/env.md` dice la stessa cosa. Un audit del 2026-09-07 (`docs/legal/AYNI_STATE_AUDIT.md`) afferma che sul VPS il flag era `true`. **Questo ambiente non legge il `.env` del VPS**, quindi lo stato vivo non è riverificato qui.

Conseguenza: il rifiuto della firma non è una proprietà del binario. È una proprietà del flag. Con il default, (b) è falso.

Lato app, `apps/mobile/src/payments/confirm.ts` **non è escluso dalla build**. Il ramo `dev_secret_` è codice sorgente sempre compilato. Parte solo se il client secret inizia con `dev_secret_`. Quel prefisso lo emette `PspPaymentProvider` quando mancano `PSP_API_URL` / `PSP_SECRET_KEY` **e** `ALLOW_PROVIDER_STUBS` è vero (default `false`). Con Stripe acceso il secret non ha quel prefisso, quindi il ramo non corre. Resta nel binario. (a) è falso nel senso chiesto dal brief («non finisca nella build»).

**Ticket API, fuori da EC-APP-1:** rifiutare `POST /payments/webhook` senza firma Stripe anche quando `PAYMENTS_ENABLED` è falso, oppure non montare affatto la route non firmata. Non si sistema dentro i PR dell’app.

Il brief §8 tiene `checkout.tsx` e `confirm.ts` fuori dalla build v1. Questo non chiude il buco sull’API, che è già pubblica.

---

## 1. Fatti del §2

| # | Asserzione del brief | Esito |
|---|---|---|
| 1 | Expo `~51.0.28`, RN `0.74.5`, `react-native-maps` `1.14.0`, `newArchEnabled: false`, bundle `it.easycasa.app` su iOS e Android | **Vera.** `apps/mobile/package.json`, `apps/mobile/app.json`. |
| 2 | `@easycasa/design-tokens` ha ancora azure `#1e5ae0`, paper `#f5f4ef`, ink `#16233b`; il web ha ink `#14212e`, paper `#f3ede1`, azure `#2c6e9b`, ochre `#c08a1e` | **Vera.** Il pacchetto non ha i nomi `ink`, `ink-soft`, `paper-deep`, `azure-pale`, `ochre`, `line-strong`. `globals.css` li ha. `apps/mobile/src/theme/theme.ts` legge `tokens.color.primary` / `paper` / `primaryDark`. L’app mostra i colori vecchi. |
| 3 | `associatedDomains` e `intentFilters` includono `easycasa.it` | **Vera come presenza nel file.** Proprietà del dominio: **non dimostrata dal repo.** `docs/phase-7.md` lo chiama apex di cutover futuro («declared in app.json associated domains for the future flip»). L’host di prodotto in `app.json` `extra` è `easycasaita.com`. Non c’è un file `apple-app-site-association` né `assetlinks.json` nel tree (la checklist di phase-7 li segna fatti; i file non ci sono). **Non si toglie il dominio in questo PR:** la risposta è la domanda aperta 13.3, non un fatto di codice. |
| 4 | Percorso DEV verso `POST /payments/webhook` senza firma | **Vedi §0.** Il percorso è nel sorgente dell’app. L’API lo onora quando `PAYMENTS_ENABLED` è falso. |

Nome store in `app.json`: `"name": "EasyCasa"`. Il brief vuole «Easy Casa Italia». Fatto per un PR successivo, non una smentita del §2.

`NSLocationWhenInUseUsageDescription` è una sola stringa inglese. Confermato.

---

## 2. Cosa fanno oggi le route fuori dal design v1

Nessuna di queste è nel perimetro schermate 01–14. Restano nel sorgente. Il brief chiede la descrizione prima di decidere se restano. **Qui non si cancellano.**

### `app/(owner)/[propertyId]/checkout.tsx`

Pagamento in app e mandato.

1. Crea un ordine dalla selezione passata in query (`items` / `packageCode`).
2. Anteprima fattura (`useInvoicePreview`).
3. `createIntent` con `purpose: 'DUE_NOW'` e `confirmPayment` (`src/payments/confirm.ts`).
4. Dopo il pagamento, crea un mandato (toggle esclusiva, default acceso, durata 6 mesi) e chiede un URL di firma. L’email firmatario è fissa: `owner@easycasaita.com`.

Il tipo del client in `src/api/billing.tsx` ammette anche `purpose: 'PROVVIGIONE'`. Questa schermata chiama solo `DUE_NOW`. L’enum API `CreateIntentDto` è `DUE_NOW | PROVVIGIONE`.

Il brief §8 la tiene fuori dalla build v1. D’accordo con il codice: è acquisto dentro l’app.

### `app/(owner)/[propertyId]/lease.tsx`

Modulo contratto di locazione, non una scheda annuncio.

Tipi: `LIBERO_4_4`, `CONCORDATO_3_2`, `TRANSITORIO`, `STUDENTI`. Campi: decorrenza, durata, canone annuo, cedolare secca, alta tensione, APE allegato. Chiama l’API rentals per un’anteprima di validazione, poi persiste un lease e legge un payload RLI.

### `app/(owner)/[propertyId]/services.tsx`

Scelta pacchetti e voci di catalogo, richiesta di preventivo, push verso checkout con la selezione serializzata. `ServiceItemRow` ha un ramo `priceModel === 'provvigione'` e una stringa propria `owner.svc.provvigione`. `QuoteSummary` ha `owner.quote.provvigioneNote`.

Sul server, con `PONTE`, `publicCatalog()` toglie le voci `priceModel === 'provvigione'` e `VIEWING_ACCOMPANIMENT` / `FULL_MEDIATION` / `BUYER_MEDIATION` / `OFFER_DRAFTING` sono `active: false` in `apps/api/src/service-catalog/domain/catalog.ts`. Il ramo UI resta compilato. Se il flag societario cambia, la riga percentuale si riaccende da sola.

### `app/(owner)/valuation.tsx`

Stima AVM. Form: comune, provincia, tipo, mq, locali, classe energetica, condizione. Coordinate fisse Milano (`lat: 45.4642`, `lng: 9.19`) con un TODO di geocoding. Mostra un importo arrotondato al migliaio e un colore di confidenza (`high` / `medium` / `low`). Non è una banda OMI con zona, semestre e fonte.

### `app/(pro)/`

Inbox di assegnazioni (`useMyAssignments`) e schermata credenziali. «Assegnare» un professionista a un incarico è il modello di questa route. Il brief la vuole fuori dal bundle v1. Il codice c’è ed è raggiungibile dal router.

### Fascicolo, per contrasto

`app/(owner)/[propertyId]/fascicolo.tsx` **è** nel design (schermata 12). Oggi: checklist documenti, upload, banner di gate. Non dichiara il pagamento alla consegna. Non va descritto come checkout.

---

## 3. Regole del §5 — l’API le regge già?

Una riga, un ticket. Nessuno di questi ticket si implementa nei PR dell’app.

### M1 — il numero del venditore non esce; il messaggio viaggia intero

**Non è vero su tutte le risposte che un compratore può ricevere.**

| Superficie | Telefono / email del venditore |
|---|---|
| `GET /listings/:id` quando `:id` è un UUID | `getDetail` → `buildListingDetail`. L’agente è `{ id, displayName }`. Nessun telefono, nessuna email. È il percorso che `EasyCasaListingsApi` si aspetta (`packages/api-client/src/phase21.ts`). |
| `GET /listings/:slug` quando `:slug` **non** è un UUID | `ListingsService.getBySlug` fa lo spread della riga e aggiunge `agent` da `publicAgentFor`: `{ displayName, phone, slug }`. Il telefono dell’utente `agentId` è nel JSON pubblico. L’email utente non c’è. Lo slug è il deep link (`pathPrefix: /listing`). |
| Enquiry del seeker (`enquiryForSeekerApi`) | Nessun campo telefono del venditore. `contactPhone` è il numero di chi ha scritto. |
| Proiezione visita seeker (`viewingForSeeker`) | Niente telefono. L’indirizzo esatto c’è solo se `status === 'CONFIRMED'`. |
| Push `enquiry.new` | Payload: `enquiryId`, `listingId`, `intent`, `message` tagliato a 200 caratteri. Il numero del venditore non c’è. Il testo **non** è inoltrato com’è scritto. |
| Thread `GET/POST /enquiries/:id/messages` | Il corpo salvato è il testo (trim, max 2000). La notifica di risposta porta solo `enquiryId` e `messageId`, non un’anteprima. `isLikelySpam` può rifiutare il messaggio: non è un inoltro incondizionato. |
| Azione esplicita «rivelo il mio numero» | Nessun endpoint. |

**Ticket `EC-APP-1-API-M1`.** Togliere `phone` da `publicAgentFor` / dal ramo slug di `GET /listings/:slug`. Allineare quel ramo al DTO Phase 21, così lo slug non è un secondo contratto. Decidere a parte il troncamento a 200 caratteri e il rifiuto spam: oggi contraddicono «inoltrato com’è scritto».

### M2 — dichiarazione verbatim col messaggio

`CreateEnquiryDto` (`apps/api/src/enquiries/enquiries.controller.ts`) ha: `intent` (`info` \| `viewing` \| `offer`), `message`, `contactEmail`, `contactPhone`, `contactWhatsappAvailable`, `banks4AllTracking`.

Non ci sono: agente sì/no, REA, per chi, tempi, modalità di pagamento, presa visione di classe e indice.

**Ticket `EC-APP-1-API-M2`.** Campi dichiarazione sul create, salvati e riletti tali e quali, senza punteggio.

### M3 — regola del venditore, ordine, non esclusione

Nessuna risorsa «regola del proprietario» su annuncio o profilo. L’ordinamento dei messaggi nel thread è `createdAt` ascendente, ma non è una regola scritta dal venditore e non è esposta sull’annuncio.

**Ticket `EC-APP-1-API-M3`.**

### V1 — orari pubblicati

**Presente.** `POST /listings/:listingId/availability` con finestre settimanali (`weekday`, `startMinutes`, `endMinutes`, `capacity`). `GET /listings/:listingId/slots` è pubblico e genera slot da quelle finestre (`apps/api/src/viewings/viewings.service.ts`). Nessun ticket per l’esistenza delle finestre.

### V2 — identità prima della conferma

`BookDto` è `{ startMs, enquiryId? }`. `confirm` chiama `transition(..., 'CONFIRM')` senza controllo di documento o di identità. Esiste un modulo `phone-verify`, non agganciato alla conferma visita.

**Ticket `EC-APP-1-API-V2`.**

### V7 — condizioni di sicurezza come vincolo di prenotazione

Nessun campo e nessun controllo nelle viewings.

**Ticket `EC-APP-1-API-V7`.**

### Nessun esito sulla visita

Lo schema ha l’esito. `ViewingStatus` è `REQUESTED | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW`. Eventi `COMPLETE` e `NO_SHOW` sono esposti al conductor (`POST /viewings/:id/complete`, `POST /viewings/:id/no-show`) e al seller (`seller-viewings.controller.ts`). Non c’è una colonna di nome `outcome`; lo status è l’esito.

L’app mobile non legge `NO_SHOW` / `COMPLETE` (nessuna occorrenza in `apps/mobile`). L’API sì. Un test di schema «nessuna visita ha un esito» **fallirebbe oggi**.

**Ticket `EC-APP-1-API-VISIT-STATUS`.**

### Classe energetica e indice su ogni scheda

Scrittura: `listings.service.publish` chiama `assertEnergyAdvertComplete`. Senza classe **e** indice il publish risponde 400. È il blocco R4 in uscita.

Lettura, che è ciò che l’app riceve:

- il pin di ricerca (`ListingPin`) ha `energyClass` nullable e **non ha** l’indice;
- il dettaglio Phase 21 ha `energy.present`, `energyClass` nullable, `performanceKwhM2Y` nullable, e viene servito anche se incompleto;
- annunci già pubblicati prima del gate restano leggibili.

L’app oggi (`ListingCard`) non mostra né classe né indice. Il dettaglio colora la classe (`ENERGY_COLORS` in `app/listing/[slug].tsx`). Quei colori sono sulla classe, non sul prezzo.

**Ticket `EC-APP-1-API-R4-READ`.** Il publish gate non basta: search e detail consegnano ancora schede incomplete. L’app, da brief, non deve renderle; il filtro di lettura è lavoro API.

`[[BUCO: elenco cause di esenzione APE]]` è già nel codice di `packages/shared/src/energy-advert.ts`. Non si colma qui.

### OMI come fatto, mai come giudizio

`GET /listings/:slug/valuation-band` restituisce ancore `selling`, `fairMarket`, `outOfMarket` e un `side` `below | in_band | above` (`apps/api/src/avm/domain/valuation-band.ts`). È un giudizio sul prezzo, non la quadrupla banda / zona / semestre / fonte.

Le analytics venditore espongono `priceVsOmiBandPct`. I nudge hanno `ABOVE_OMI_BAND` e `BELOW_OMI_BAND`. Le quotazioni grezze stanno in `omi_quotes` / `omi_zone_quotes`, non sul DTO pubblico dell’annuncio.

**Ticket `EC-APP-1-API-OMI-FACT`.** Un DTO pubblico che sia solo banda, zona, semestre, fonte. Il valuation-band attuale non va riusato tale e quale sulla scheda.

### Tier 3 — agente che apre la porta

Non c’è una lista di agenti iscritti, con REA e P.IVA, scelti dal venditore, ordinati solo per un criterio pubblicato, senza compenso di piattaforma.

`VIEWING_ACCOMPANIMENT` è nel catalogo sorgente, `active: false`, prezzo fisso 4900 centesimi. Non è il tier 3 del brief. Il gruppo `(pro)/` è un’inbox di assignment, non quella scelta.

**Ticket `EC-APP-1-API-TIER3`.**

---

## 4. Cose già vere, da non rifare

- Stato societario `PONTE`: il catalogo pubblico non elenca voci `provvigione` (`publicCatalog` in `catalog.ts`).
- `VIEWING_ACCOMPANIMENT`, `FULL_MEDIATION`, `BUYER_MEDIATION`, `OFFER_DRAFTING` sono `active: false`.
- Il preventivo in stato `PONTE` rifiuta una voce `provvigione` (`pricing.ts`).
- Publish rifiuta classe o indice mancanti.
- La proiezione visita del seeker non contiene il telefono del conductor.
- Il dettaglio UUID non contiene il telefono.

---

## 5. Cosa questo PR non fa

- Non aggiorna Expo.
- Non toglie Banks4All, `QUALIFIED`, `offer`, `provvigione`, `VIEWING_ACCOMPANIMENT` dall’app. Ci sono. Il conteggio per lo scan del PR 2 è lavoro del PR 2.
- Non crea i due gusci, né la schermata 01.
- Non sceglie SDK 55 o 56. Quella frase è del PR 1, e parte solo dopo questo censimento.
- Non scrive sulle board Kaizen / Startup: il brief non assegna una delle quattro categorie né una fase 1–6.
- Non ha un `task_<hex>`. Il ledger, se aggiornato, userà il codice `EC-APP-1` senza un id bridge.

## 6. Domande aperte che il codice non chiude

Restano le quattro del §13 del brief. Sul punto 3, l’unica frase nel repo è che `easycasa.it` è un apex di cutover futuro, non una prova di titolarità.
