# EC-S-T02 — Counsel Review Packet: "Vendi da privato" Page Claims

**Status:** TEMPLATE FOR COUNSEL REVIEW — nothing herein is final legal text.  
**Requesting entity:** Mundida group (P.IVA IT04531990986) — EasyCasa (easycasaita.com)  
**Page under review:** `/{locale}/vendi-da-privato`  
- IT: https://easycasaita.com/it/vendi-da-privato  
- EN: https://easycasaita.com/en/sell-privately  
- ES: https://easycasaita.com/es/vender-entre-particulares  

**Ledger:** `apps/web/src/config/sell-privately/promises.json`  
**Guard:** `apps/web/src/lib/promiseLedger/` — `validateLedger` (build + vitest) refuses `blocks.*.live` until this packet is signed off and the guard is intentionally updated.

**Interim rule in force:** `blocks.savingsFigures` and `blocks.mediazioneCopy` are `"fallback"` — no EUR comparison figures and no “portal, not agent” claim render publicly until counsel clears the claims below.

> **Engineering note — gate vocabulary:** runtime states are `live` | `fallback` | `hidden` (not `full`). Deliverable C should say which blocks may flip to **`live`**.

---

## Claim 1 — Savings comparison (highest priority)

**Proposed public copy (IT master) — gated; not live:**

> "Le agenzie in Italia applicano abitualmente circa il 3% + IVA per parte. Su una vendita di €250.000 sono **€7.500–€9.150**. Su EasyCasa, annuncio, richieste e strumenti di visita sono gratuiti."  
> Nota: "La legge italiana non stabilisce una provvigione minima; le tariffe d'uso variano per provincia (rif. AGCM provv. 13035/2004)."

(Stored under `sellPrivately.savings.*` in `apps/web/messages/{it,en,es}.json`; rendered only when `blocks.savingsFigures === "live"`.)

**Questions for counsel:**

1. Does the range "€7.500–€9.150" with the qualifier "abitualmente/circa" satisfy comparative-advertising requirements (D.Lgs. 145/2007; Codice del Consumo artt. 21–23) without a cited tariff source? If a source is required, is CCIAA usi per province acceptable, and must we name specific chambers?
2. Is "gratuito" permissible given planned optional paid services (featured listings, premium tier)? Proposed mitigation: "L'annuncio è gratuito. Offriamo servizi opzionali a pagamento, mai una percentuale sulla vendita."
3. Any AGCM exposure in the implied claim that agency commission is avoidable in all cases (e.g., where a seller has an existing exclusivity mandate)?

**Fallback currently live** (`blocks.savingsFigures === "fallback"`):

| Locale | Title | Body |
|--------|-------|------|
| IT | Pubblica gratis. Tieni ciò che ricavi dalla vendita. | Su EasyCasa annuncio, richieste e strumenti per le visite sono gratis per chi vende da privato. I servizi opzionali hanno un prezzo separato — mai una percentuale sul prezzo di vendita. |
| EN | List free. Keep what you earn from the sale. | On EasyCasa, listing, enquiries and viewing tools are free for private sellers. Optional services are priced separately — never as a percentage of your sale price. |
| ES | Publica gratis. Quédate con lo que ganas con la venta. | En EasyCasa el anuncio, las consultas y las herramientas de visita son gratis para particulares. Los servicios opcionales tienen precio aparte — nunca un porcentaje del precio de venta. |

> *Earlier draft fallback “Niente commissioni…” was not shipped; the table above is production.*

**Counsel decision (Claim 1):**  
- [ ] Approve proposed figures copy as-is  
- [ ] Approve with amendments: _______________  
- [ ] Keep fallback only / revise fallback: _______________  
- [ ] May flip `savingsFigures` → `live`: ☐ yes ☐ no — date/name: _______________

---

## Claim 2 — "Portal, not agent" block (T04 dependency)

**Proposed public copy — gated; not live:**

> "Siamo un portale, non un'agenzia immobiliare. Non trattiamo per te, non gestiamo offerte e non prendiamo percentuali. Le decisioni — e i risparmi — restano tuoi."

(`sellPrivately.not.title` / `not.body`; rendered only when `blocks.mediazioneCopy === "live"`.)

**Questions for counsel:**

4. Does this wording, combined with the feature set (viewing scheduler, enquiry inbox, OMI data display, buyer financial badges), keep EasyCasa outside mediazione under L. 39/1989 and Cass. definitions of "messa in relazione"? See the full boundary matrix in [`T04_mediazione_boundary.md`](./T04_mediazione_boundary.md) (rows 1–12 + open questions) — counsel is asked to approve the matrix, not only this copy.
5. Is an explicit disclaimer required on listing pages themselves, or only on this info page?

**Fallback currently live** (`blocks.mediazioneCopy === "fallback"`):

| Locale | Title | Body |
|--------|-------|------|
| IT | Ruoli chiari, documenti chiari | EasyCasa pubblica nelle condizioni e nell’informativa le regole su annunci, servizi opzionali e dati. Le qualificazioni giuridiche definitive le confermiamo con il legale prima di scriverle qui. |
| EN | Clear roles, clear documents | EasyCasa publishes the rules that apply to listings, optional services, and your data in the terms and privacy notice. Legal classifications are confirmed with counsel before we publish definitive wording here. |
| ES | Roles claros, documentos claros | EasyCasa publica en los términos y el aviso de privacidad las reglas sobre anuncios, servicios opcionales y datos. Las calificaciones jurídicas definitivas las confirmamos con asesoría legal antes de publicarlas aquí. |

**Repo tension for counsel (do not ignore):** `docs/legal/mediation-disclosure.md` still describes EasyCasa as a **licensed real-estate mediator** (template). Claim 2 asserts “portal, not agency.” Please reconcile with T04 and existing mediation disclosure.

**Counsel decision (Claim 2 / T04):**  
- [ ] Approve matrix + copy  
- [ ] Approve matrix; amend copy: _______________  
- [ ] Keep fallback; mediazione figure is X: _______________  
- [ ] May flip `mediazioneCopy` → `live`: ☐ yes ☐ no — date/name: _______________

---

## Claim 3 — Verified Buyer badge references (Banks4All)

**Proposed / live-adjacent public copy:**

> "Le richieste possono includere un badge finanziario verificato fornito da Banks4All, società del gruppo Mundida."

**Currently live (IT how-it-works step, ledger `buyers` = live):**  
> "Le richieste possono portare un badge finanziario Acquirente verificato di Banks4All (gruppo Mundida), così sai chi è concreto prima di aprire la porta."

**Constraint already encoded (B4A-2):** no independence claims — shared group / VAT makes them falsifiable.

**Questions for counsel:**

6. Is the group disclosure ("società del gruppo Mundida") sufficient here, or is the full P.IVA/legal-entity identification required at each mention?
7. Does describing the badge as "verificato" create any implied warranty by EasyCasa regarding buyer solvency? Proposed mitigation footnote: badge reflects an attestation valid at issue date (`expires_at`), not a guarantee.

**Counsel decision (Claim 3):**  
- [ ] Approve live step/FAQ wording  
- [ ] Amend to: _______________  
- [ ] Require P.IVA on each mention: ☐ yes ☐ no  
- [ ] Require expires_at / non-guarantee footnote: ☐ yes ☐ no

---

## Claim 4 — "Verified Owner" badge (forward-looking, marked "In arrivo")

Step/benefit P3 and how-step `verify` are ledger-`coming` → UI chip **"In arrivo"** / **"Coming soon"** / **"Próximamente"** (i18n; not hardcoded).

**Questions for counsel:**

8. May we publicly describe a coming feature ("badge Proprietario Verificato") provided it renders with the "In arrivo" chip? Any Codice del Consumo issue with advertising unavailable features when clearly labelled?
9. For the future feature itself: is visura-based owner verification by a portal permissible without additional authorisation, and what disclaimer is needed about verification limits (e.g., co-ownership, pending successions)?

**Counsel decision (Claim 4):**  
- [ ] "In arrivo" labelling sufficient for current copy  
- [ ] Remove / soften coming copy until T14  
- [ ] Future feature disclaimer required: _______________

---

## Claim 5 — "Genuine listings" marketplace positioning

**Questions for counsel:**

10. May we state "annunci verificati e reali" as a marketplace claim while moderation (T15) is human-review based? What substantiation standard applies?

**Counsel decision (Claim 5):**  
- [ ] Permitted with substantiation: _______________  
- [ ] Not permitted until T15 live; interim wording: _______________

---

## Requested deliverables from counsel

| ID | Deliverable |
|----|-------------|
| **A** | Approved/amended text per claim (IT master; EN/ES follow translations). |
| **B** | Approval of the T04 boundary matrix ([`T04_mediazione_boundary.md`](./T04_mediazione_boundary.md)). |
| **C** | Confirmation of which `promises.json` blocks may flip to **`live`** and in what order. |
| **D** | Any required additions to page footer legal text (`sellPrivately.foot.*`). |

### Sign-off box

| Field | Value |
|-------|-------|
| Counsel name / firm | |
| Date | |
| Claims cleared for `live` | ☐ 1 savingsFigures · ☐ 2 mediazioneCopy · ☐ 3 B4A copy · ☐ 4 coming features · ☐ 5 genuine listings |
| Attachments returned | |

---

## Process note (engineering — deliberate friction)

Upon sign-off, flipping a block to `live` requires **both**:

1. Edit `apps/web/src/config/sell-privately/promises.json` (`blocks.savingsFigures` and/or `blocks.mediazioneCopy` → `"live"`).
2. Update the interim guard in `apps/web/src/lib/promiseLedger/promiseLedger.test.ts` **and** the matching rule in `apps/web/src/lib/promiseLedger/index.ts` / `apps/web/scripts/validate-promise-ledger.mjs` (`enforceCounselInterim`), otherwise CI/build fails.

Record the counsel sign-off date in the PR that flips the flags.

### Related files

| File | Role |
|------|------|
| `docs/sell-privately.md` | Page / ledger engineering spec |
| `docs/ec-s-roadmap.md` | EC-S task track |
| `docs/legal/mediation-disclosure.md` | Existing mediazione template (tension with Claim 2) |
| `docs/banks4all-integration.md` | B4A product/legal context |
| `apps/web/messages/{it,en,es}.json` → `sellPrivately` | All page copy |
