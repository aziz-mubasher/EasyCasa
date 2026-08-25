# CLAUDE.md — EasyCasa Italia

> **Load this before designing, specifying or building anything in this repository.**
> It is not background reading. It is the constraint set.
>
> Cursor: reference this file from `AGENTS.md` / `.cursorrules` so the venture agent loads it too.

| | |
|---|---|
| **Venture** | EasyCasa Italia · easycasaita.com |
| **Venture id (bridge)** | `easycasa` · **Code** `EC` |
| **Repo** | `aziz-mubasher/EasyCasa` |
| **Legal entity** | Mundida S.r.l. · P.IVA IT04531990986 · Brescia |
| **Boards** | https://www.azizmubasher.net/startup/easycasa · /kaizen/easycasa |
| **Doc version** | v1 · 25 August 2026 |

**This file is deliberately thin, because `docs/legal/T04_mediazione_boundary.md` already does the
work.** T04's twelve-row matrix is the operative boundary for the portal product and this file does
not restate it. What follows is the **delta**: two places where T04's own premise needs testing, the
Aste layer T04 never covered, and one thing about the sign-off that must never be misread.

---

## §0 Read this first — the four things that govern everything

1. **`docs/legal/T04_mediazione_boundary.md` is the governing matrix for the portal product.** Rows
   10–12 are prohibited. Every task touching rows 3, 6 or 9 carries that row's conditions as
   acceptance criteria. Do not re-derive it here; cite the row.
2. **"G1 SIGNED" means the product owner signed, not a lawyer.** T04's sign-off field reads *"AZM
   product-owner authorisation"*, the counsel verdict column is unchecked for rows 1–8 and 10–12, and
   T04's own footer says *"Binding only after counsel approval."* The aste addendum is
   *"counsel-review-pending"* throughout. **The ledger says signed; no external lawyer has reviewed
   this.** §4.
3. **The "portale / no mediazione" framing cannot be assumed on the current feature set.** §1. The
   ministerial test points the other way, but it rests on one unpublished parere about tradespeople —
   so this is a question that has become urgent, not a conclusion. It contradicts live copy either way.
4. **The Aste product's sharpest exposure is not mediazione — it is `art. 348 c.p.`** Written legal
   risk analysis of a live *esecuzione* file, sold continuously through a platform, is what art. 2
   c. 6 L. 247/2012 reserves to avvocati. §3.

Derived from research, not legal advice. §7 is the list for counsel — and it is now urgent.

---

## §1 The portal boundary — where T04's premise needs testing

T04's working hypothesis: *"a bacheca/portale that limits itself to hosting listings and providing
neutral tools does not perform mediazione; the risk zone is any activity that facilitates the
conclusion of the specific deal."*

**The ministry's test is broader than that hypothesis.** MISE **parere 24 novembre 2016, prot.
n. 370305**, on mediazione through an online service, treats a platform as mediazione where the
operator:

1. performs **valutazioni di merito** on the offers or counterparties in its database;
2. **matches** a stated need to specific counterparties;
3. **actively influences** the connection between the parties;
4. is **remunerated as a provvigione on conclusion**.

A site limited to *"asettiche elencazioni di caratteristiche e professionalità"*, with no
professional intervention and no steering, is not mediazione.

⚠️ **Three caveats on that parere, and they matter — do not overstate it to counsel.** The quesito
concerned a site connecting clients with **professionisti/artigiani**, not immovables, so extending it
to a property portal is an argument rather than a citation. The ministry reasoned on the operator's
conduct **as a composite**, not element by element. And the parere is indexed in one place on the open
web, a single CCIAA news page, and appears in neither the 2016 nor the 2017 MIMIT *massimario dei
mediatori* — it is an unpublished administrative opinion binding on nobody, and it is currently the
sole support for this section.

**Applied to the live feature set, on the composite reading, the position is uncomfortable:**

- **Verified buyer purchasing capacity** — T04 row 6, live as EC-1 — is a merit evaluation of a
  counterparty.
- **Enquiry funnels** routing owners to interested buyers go to matching.
- **Viewing scheduling** — T04 row 4, live as EC-3–7 — is intervention in the approach phase.

T04's own **open question 2** asks whether the badge plus the scheduler *in combination* approach
*messa in relazione*. **On the composite reading the answer is probably yes** — which is the same
question T04 asked and did not get answered. This file does not resolve it; it says the working
hypothesis cannot be assumed and the question is now urgent.

### §1.1 The flat-fee defence does not work

T04 row 8 and `mediation-disclosure.md` both lean on flat, success-independent pricing and no
*provvigione*. That is a good rule for other reasons — keep it — **but it is not a reason the venture
sits outside L. 39/1989.**

**Cass. civ., Sez. Un., 2 agosto 2017, n. 19161:** *"È configurabile, accanto alla mediazione
ordinaria, una mediazione negoziale cosiddetta atipica, fondata su un contratto a prestazioni
corrispettive, con riguardo anche ad una soltanto delle parti interessate (c.d. mediazione
unilaterale)."* Atypical and unilateral mediation on immovables fall **inside** the law, and the
principio ends by holding that acting without iscrizione *"esclude, ai sensi dell'art. 6 della stessa
legge, il diritto alla provvigione."* ⚠️ Restitution under art. 8 appears in the **motivation**, not
the principio; and what the motivation excludes is the parties' action *ex art. 2033 c.c.* — **do not
cite this case for "no art. 2041 fallback"**, which is a different proposition on other authority.

⚠️ **And note what SU 19161 actually requires:** an *incarico* to search for a counterparty for a
specific single *affare*. A flat listing fee with no mandate to find a buyer is **not obviously that**.
The flat-fee point below is a real worry, not a settled proposition.

And the Chambers of Commerce maintain a registered category for precisely this shape: **"agente di
affari in mediazione con mandato a titolo oneroso"**, same SCIA, same requisiti, same polizza.

> **A flat fee from one side is not, by itself, the absence of mediazione — there is a named,
> registrable sub-category shaped exactly like it.** Treat "we charge a flat fee, therefore we are not
> a mediatore" as an argument that may fail, not as a defence. It is currently load-bearing in T04.

### §1.2 The contradiction that has to be resolved first

Two records of the venture's own status disagree:

- Portfolio memory records EasyCasa as **operating with a mediazione authorisation** — a licensed
  agency.
- `docs/legal/mediation-disclosure.md`, **live since 2026-08-13**, tells enquirers: *"EasyCasa opera
  come portale di pubblicazione annunci: **non svolge attività di mediazione immobiliare** su questa
  richiesta e non matura una provvigione sul prezzo di vendita."*

**These cannot both be the operating posture, and the live text is a statement about regulatory
status made to consumers.**

- **If Mundida holds the REA registration**, the disclosure denies a licence it holds. That is not a
  reserved-activity problem, but it is a misdescription in gated consumer copy, and it forfeits the
  protection registration buys.
- **If it does not**, the disclosure is a defence that the MISE criteria and SU 19161/2017 do not
  support on these facts.

**Establish the actual REA position by visura before anything else in this file is acted on.** §7.1.

---

## §2 What is settled, and stays settled

These hold in every scenario and are not up for re-litigation by a task brief:

1. **Rows 10–12 of T04 stay prohibited** — collecting or transmitting offers, *proposta d'acquisto*
   templates and *caparra* handling, and advising either party on negotiation. No exceptions without a
   written counsel opinion, per T04's own engineering rule 5.
2. **No fee anywhere is a percentage of, or contingent on, a sale.** T04 row 8, engineering rule 4.
   Catalogue `legal_basis` and Stripe amounts stay flat. **Keep this even though §1.1 shows it is not
   the perimeter defence** — it remains correct on transparency and on art. 1755 c.c.
3. **The AI must refuse price recommendations and negotiation advice.** T04 rows 3 and 12,
   engineering rule 3 — enforced in the `services/ai` prompt constraints and test fixtures, not by
   review.
4. **Copy rule:** EasyCasa tools are described as things the *seller does*, never things EasyCasa does
   *to the deal*. T04 engineering rule 2.
5. **Every T20–T29 brief cites the T04 row it touches**, and ⚠️ rows carry their conditions as
   acceptance criteria.
6. **Group separation is correct and should stay** — but on the right authority. **MISE parere 12
   gennaio 2015 prot. 2447** did reject stacking secondary activities under one mediazione P.IVA,
   ⚠️ **but it applied the pre-2019 text of art. 5 c. 3, which L. 3 maggio 2019 n. 37 replaced** with a
   narrower, settore-keyed incompatibility. Do not lean on it. The durable ground for keeping Banks4All
   separate is **art. 128-sexies c. 3 TUB**, which requires a mediatore creditizio to have an exclusive
   corporate object. See §5.

---

## §3 Aste — the layer T04 never covered

`docs/legal/aste-counsel-addendum-lgl1.md` asks counsel six good questions. **It asks the wrong
question first.** Q-A3 asks whether the disclaimer wording is adequate. The prior question is whether
the activity is reserved at all.

### §3.1 `art. 348 c.p.` is the top exposure

**L. 247/2012 art. 2 c. 6, in full — the opening clause is load-bearing and must not be dropped:**

> *"**Fuori dei casi in cui ricorrono competenze espressamente individuate relative a specifici settori
> del diritto e che sono previste dalla legge per gli esercenti altre professioni regolamentate**,
> l'attività professionale di consulenza legale e di assistenza legale stragiudiziale, **ove connessa
> all'attività giurisdizionale, se svolta in modo continuativo, sistematico e organizzato**, è di
> competenza degli avvocati."*

That opening is the statutory carve-out for **other regulated professions** — and it is exactly the
ground on which a countersigning *tecnico abilitato* (§3.2, §3.4) would operate for the urbanistica,
catastale and *stima* sections. Quoting c. 6 without it both overstates the reserve and hides the
mitigation.

Read against the product, every element is satisfied on the face of it:

| Element | The product |
|---|---|
| *consulenza legale stragiudiziale* | *analisi giuridica* — diritto venduto, opponibilità, vincoli, gravami, rischi procedurali |
| *connessa all'attività giurisdizionale* | the input **is a pending esecuzione forzata**, with an ordinanza and a CTU in the file |
| *continuativo, sistematico e organizzato* | it is a SaaS with a paid tier |

**Cass. pen., Sez. VI, n. 18734/2025** (ud. 26/02/2025, dep. 19/05/2025) left standing a conviction
under art. 348 c.p. for out-of-court legal consultancy by a non-lawyer — advice on opposing a decreto
ingiuntivo, some €7.600 over eight months — holding that *"A rilevare è invece che l'attività di
consulenza sia destinata a incidere su un contenzioso giudiziale, presente o futuro."* No formal
mandate is needed. ⚠️ The ricorso was declared **inammissibile**, so this is thinner precedent than a
rejection on the merits. Say so if it is cited.

**Cass. pen., Sez. Un., n. 11545 del 2012** (ud. 15/12/2011, dep. 23/03/2012 — the *esperto contabile*
case; **it is 2012, not 2018**) frames it generally: *atti tipici* are criminal even if isolated or
free; *atti relativamente liberi* become criminal when performed with **continuità, onerosità e
organizzazione**, creating an objective appearance of legitimate professional activity.

⚠️ **A contrary civil line exists** (Cass. civ. 12840/2006 and successors) holding stragiudiziale
consultancy open to non-lawyers. **Do not argue that the contrary line is weaker because it predates
L. 247/2012 — SU 11545 predates it too**, by nine months. The honest position is that the authorities
point in different directions, that the criminal chamber's recent direction is unfavourable, and that
**an auction file is the worst available fact pattern** because "connessa all'attività giurisdizionale"
is on the face of the input document.

### §3.2 The technical sections, and the most dangerous word in the report

*Conformità urbanistica e catastale*, *difformità*, **sanabilità**, *stima lavori*. An unsigned,
unasseverated opinion is not a reserved act in the strict sense — what is reserved is the act needing
a *tecnico abilitato*'s signature (DOCFA/PREGEO; and **art. 36-bis c. 3 DPR 380/2001**, as introduced by DL 69/2024 conv. L. 105/2024,
which requires *"la dichiarazione del professionista abilitato"* accompanying a sanatoria request.
⚠️ **art. 36 itself carries no such requirement** — practice always uses a tecnico, but there is no
statutory reserve there to point at. Do not pair the two articles.)
But delivered continuously, for a fee, through an organised platform, these are textbook *atti
relativamente liberi* under SU 11545/2018.

> **`sanabilità` is the single most dangerous word in the report** — it is a conclusion about the
> outcome of a procedure only an asseverating tecnico can initiate. Treat it as a banned output token
> unless a tecnico signs.

### §3.3 What the disclaimer does and does not do

The draft disclaimer is worth writing well: SU 11545/2018's second limb turns on **objective
appearance**, and a prominent, contemporaneous, unavoidable disavowal is direct evidence against it.

**It does not help in four places.** It does nothing against *atti tipici*. It does not touch
*continuità, onerosità, organizzazione* — those are facts about the business model, admitted on the
pricing page. It does not answer art. 2 c. 6, which asks what the activity *is*. And **art. 1229 c.c.**
voids clauses pre-excluding liability for *colpa grave*, while **art. 33 c. 2 Cod. Cons.** presumes
such clauses vexatious against a consumer — so a bidder who loses a *cauzione* over a missed *gravame*
is not answered by a footer.

### §3.4 The three mitigations, in descending strength

1. **A qualified human in the loop.** An *avvocato* countersigns the legal section; a *tecnico
   abilitato* countersigns urbanistica, catastale and *stima lavori*. This converts the question from
   "is this abusive practice" into "is this a professional service with software leverage" — and it is
   the only version that can carry professional indemnity insurance.
2. **Extract-and-cite, not assess-and-rate.** Retrieval over the uploaded document with a page
   citation is a materially different feature from a generated *criticità* with a risk rating. **This
   distinction is designable and it is the cheapest real mitigation available.** Structured display of
   what the document *says* is information; a written assessment of the risks *in this file*, oriented
   to *this bidder's* decision, is advice.
3. **The disclaimer** — real but partial, and worthless against the reserved-act limb.

### §3.5 Two formalities nobody has checked

- 🚩 **`art. 115 TULPS` — agenzia d'affari, and the authority is not the one you would guess.**
  *"Assistenza aste"* and *"disbrigo pratiche conto terzi"* both sit within art. 115. But the transfer
  of agenzia d'affari competence to the Comuni **expressly excludes** those relating to *recupero
  crediti, **pubblici incanti**, agenzie matrimoniali e di pubbliche relazioni*, which stay with the
  **Questura** and require an **autorizzazione, not a SCIA**. So: *disbrigo pratiche* → SUAP;
  **auction assistance → Questura.** Sending the auction question to SUAP Brescia gets the wrong
  answer. ⚠️ Local application varies and Brescia was not verified. Cheapest item on this list.
- 🚩 **Bidder assistance, if it is ever built** (addendum Q-A4) — **and the earlier reading of this
  was wrong.** art. 579 c.p.c., which permits a *mandatario munito di procura speciale*, is rubricated
  *"Persone ammesse agli incanti"* and governs the **incanto** — now the exceptional form. Immovable
  sales are ordinarily **senza incanto**, governed by **art. 571 c. 1 c.p.c.**: offers may be made
  *"personalmente o a mezzo di **procuratore legale**"*. **Cass. civ., Sez. III, 5 maggio 2016,
  n. 8951** holds that in vendita senza incanto a non-lawyer mandatario with procura speciale is **not
  admitted** — the irrevocability of the senza-incanto offer justifies requiring *"la figura tecnica di
  un legale"*.

  > **For the sale form that actually occurs, bidder representation is effectively lawyer-only.** A
  > non-lawyer EasyCasa mandatario submitting an offer is outside the code. If this product is ever
  > built it is built with avvocati, or not at all.

  Trib. Catania, 27 gennaio 2022 confirmed exclusion of a telematic offer for presenter/offerente
  mismatch. ⚠️ The offer is excluded and the *cauzione* is returned — **forfeiture arises under art.
  587 c.p.c. against a defaulting *aggiudicatario*, which is a different situation.** Do not tell a
  client they lose the deposit. What they lose is the opportunity.

  ⚠️ **DM 32/2015 art. 12 c. 4** was cited earlier for the *atto pubblico o scrittura privata
  autenticata* form. That form requirement appears in tribunal vademecums attached to the
  **multi-offeror** procura, and c. 4 may instead be the PEC provision. **Unverified and probably
  mis-anchored — re-pull the decree before quoting it.**

  And if EasyCasa were ever paid a success fee on *aggiudicazione* while sourcing the opportunity,
  that is structurally *procacciamento d'affari* on immovables, which SU 19161/2017 puts inside
  L. 39/1989.

### §3.6 Run Aste in a separate entity

**Recommended, and cheap now.** art. 1754 c.c. bars a mediatore from being linked to a party by
*rapporti di rappresentanza*; **art. 5 c. 3 L. 39/1989**, as replaced by L. 37/2019, makes mediazione incompatible with
*"professioni intellettuali afferenti al medesimo settore merceologico"* and *"e comunque in
situazioni di conflitto di interessi"*. A separate entity, a documented same-property exclusion and a
written conflict disclosure answer both at once — and it mirrors what the group already does with
Banks4All.

⚠️ **On CJEU C-242/23** (*Tecno\*37*, 4 Oct 2024): art. 25(1) of Dir. 2006/123 precludes a *general*
incompatibility between mediazione immobiliare and amministrazione di condominio, because it does not
test for actual conflict. **Do not reason that the domestic text still governs because it has not been
amended** — national authorities and courts must **disapply** a provision incompatible with a
directly effective directive. The ruling addressed that specific combination and did not strike art. 5
c. 3 wholesale, so the separate-entity recommendation stands on its own merits, not on a blanket ban.

---

## §4 The sign-off gap

This is the item most likely to cause harm by being misread.

| Artefact | What the ledger says | What it is |
|---|---|---|
| `T04_mediazione_boundary.md` | **G1 SIGNED (AZM 2026-08-13)**, rows 1–8 + 12; Claim 2 `mediazioneCopy` → **live** | Sign-off field: *"AZM product-owner authorisation"*. Counsel verdict column **unchecked** for rows 1–8 and 10–12. Footer: *"Binding only after counsel approval"* |
| `mediation-disclosure.md` | Reconciled to portal framing, live | *"Reviewed with AZM product-owner authorisation… Not a substitute for external counsel advice"* |
| `aste-counsel-addendum-lgl1.md` | Bundled for *"one counsel round"* | Every quoted disclaimer and consent text *"counsel-review-pending"* |

**So: consumer-facing copy asserting a regulatory position went live on a product-owner signature,
and the counsel round it was written for has not returned.** That is a defensible way to move fast on
an internal policy. It is not a defensible basis for a statement to consumers about whether the
company performs a regulated activity.

**Engineering rule:** any ledger state that gates copy on a legal position must record **who signed
and in what capacity**. `signedBy: AZM` and `signedBy: counsel` are different states and must not
collapse into `signed: true`.

---

## §5 Family seams

- **Banks4All is a separate entity and stays that way.** Mediazione immobiliare and mediazione
  creditizia are compatible activities, but MISE 12/01/2015 forbids stacking them under one P.IVA.
- **The buyer financial badge** (T04 row 6, `docs/banks4all-integration.md`) is the live seam. Two
  constraints, from both sides: EasyCasa makes **no solvency representation of its own** — it displays
  a third-party attestation; and under Banks4All's own constitution, **nothing EasyCasa sends may
  constitute a credit-need intake or a routing to a lender**, which is reserved to an OAM-enrolled
  subject. Keep the badge a badge.
- **The AVM must never present as an official valuation.** If it will ever feed a Banks4All credit
  flow, build a **confidence measure into it now** — an AVM used in a lending decision attracts a
  different regime than one shown to a curious owner.
- ⚠️ **AML is unexamined.** *Mediatori immobiliari* are *soggetti obbligati* under **art. 3 c. 5 lett. e)
  D.lgs 231/2007** — *"gli agenti in affari che svolgono attività in mediazione immobiliare in presenza
  dell'iscrizione al Registro delle imprese"*, extended to letting intermediation where monthly rent
  is ≥ €10.000. Note the trigger is **iscrizione**, which ties this to §1.2. Outside the research pass
  otherwise. §7.

---

## §6 Data — Aste is the sharp end

The addendum's Q-A1 working assumption is art. 6(1)(f) for the debtor's data. **Test that assumption
hard, because the balancing runs against us:** the data subject is a third party who uploaded nothing,
has no relationship with EasyCasa, and whose identity **the law itself ordered removed from the very
document being processed**.

- **art. 490 c.p.c.:** *"Nell'avviso è omessa l'indicazione del debitore."*
- **Garante, provv. 7 febbraio 2008, doc. web 1490838:** the omission extends to the published
  **ordinanza and perizia**, and to unrelated third parties — publishing them in full would
  *"nullify"* the protection given by omitting the name from the avviso.
- **Garante, parere 18 luglio 2024, doc. web 10063581** expressly flags the unresolved question of
  **who is responsible when sale notices are published in breach on advertising websites, and what
  GDPR role they hold.** A platform that ingests, structures, stores and answers questions about these
  documents is not a passive host — it is a *titolare* for its own processing. **That open question is
  aimed at products like this one.**

**Therefore, as engineering rules:**

1. **Assume every uploaded document is contaminated.** Redaction obligations on published perizie are
   widely under-complied. **Redact at ingest — before the model, the index or storage** — stripping
   *nome, codice fiscale, data e luogo di nascita, residenza*, and third-party names (confinanti,
   occupanti, condomini). The addendum's Q-A3 proposal to mask **outputs while storing sources
   unmodified is the wrong way round.**
2. **Never re-publish.** Ingesting for one user's own analysis is one processing; an aggregated
   auction catalogue derived from those documents is another, and walks into the 2008 provvedimento.
3. **`noindex` and robots exclusion on every page derived from a procedura.**
4. **Retention: 5 years maximum, and preferably far less.** The Garante fixed 5 years for BDAG/PVP
   themselves; a commercial derivative has no basis for longer. The addendum's provisional 365 days is
   defensible; do not extend it without a reason.
5. **A DPIA is mandatory before Aste touches a real file** — art. 35 GDPR: large-scale processing of
   data relating to judicial proceedings combined with automated evaluation producing risk indicators.
   It is the first document an inspection asks for.
6. ⚠️ **One live question the addendum does not ask.** A *perizia CTU* routinely records **abusi
   edilizi**, which are criminal offences under art. 44 DPR 380/2001 — and the report extracts exactly
   that as a headline *criticità*. Whether a structured record asserting that an identified person's
   property carries an abuso engages **art. 10 GDPR** is arguable and unresolved. Redaction at ingest
   makes the question moot, which is another reason to do it.
7. **OpenAI as sub-processor** (Q-A6) receives document text containing third-party PII. Redaction at
   ingest changes what that question is even about. Resolve the DPA, EU-region processing and the
   informativa entry — but resolve the redaction first.

---

## §7 What needs a human — and the counsel round is now overdue

1. 🚩 **Pull a visura and establish whether Mundida holds the mediazione REA registration**, and
   reconcile it with the live *"non svolge attività di mediazione immobiliare"* disclosure. §1.2.
   Nothing else in this file can be settled first.
2. **Send the counsel round.** T04 rows 1–8 and 10–12 and the entire aste addendum are unanswered.
   Add to the packet, as new questions: art. 2 c. 6 L. 247/2012 on the *analisi giuridica* (§3.1);
   whether a tecnico abilitato must countersign the technical sections (§3.2); art. 115 TULPS in
   Brescia (§3.5); D.lgs 231/2007 for the group (§5); and the art. 10 GDPR question at §6.6.
3. **Whether Aste runs in a separate entity.** §3.6. Cheap now, painful to retrofit.
4. **Whether the Aste legal and technical sections ship with a countersigning professional**, or ship
   restricted to extract-and-cite. §3.4. This is a product decision with a criminal-liability profile.
5. **Whether bidder assistance is ever offered** (addendum Q-A4), and if so under what procura
   mechanics. §3.5.
6. **What is said to consumers about EasyCasa's status** once item 1 resolves.

---

## §8 Confidence and gaps

| Item | Confidence |
|---|---|
| art. 1754 / 1755 c.c.; artt. 6 and 8 L. 39/1989 | **High** |
| Cass. SU 19161/2017 — mediazione atipica and unilaterale inside L. 39/1989, no provvigione | **High** on the principio (verbatim) · art. 8 restitution is motivation only · **the art. 2041 point is a misattribution — the motivation excludes art. 2033** |
| SU 19161 requires an *incarico* for a specific affare, so a bare listing fee may fall outside it | **Medium** — this cuts against §1.1 and is stated there |
| "agente di affari in mediazione con mandato a titolo oneroso" is a registered category | **High** — CCIAA Torino |
| MISE parere 370305/2016 four criteria | **Low-medium.** Single unpublished CCIAA restatement, **about tradespeople not immovables**, absent from the 2016 and 2017 MIMIT massimari, and reasoned as a composite. **The central claim of §1 rests on this alone** |
| Cass. pen. SU 11545 is of **2012**, not 2018 | **High** — and it means the "contrary line predates L. 247/2012" argument is unavailable |
| Cass. pen. VI 18734/2025 | **Medium-high** — exists and holds as described, but the ricorso was *inammissibile* |
| Bidder representation in vendita **senza incanto** is effectively lawyer-only (art. 571 c. 1 c.p.c.; Cass. III 8951/2016) | **High** — and it reverses the art. 579 reading |
| An excluded telematic offer forfeits the *cauzione* | **False.** The cauzione is returned; forfeiture is art. 587 c.p.c. against a defaulting aggiudicatario |
| DM 32/2015 art. 12 c. 4 as the procura form provision | **Unverified and probably mis-anchored** |
| MISE parere 12/01/2015 on stacked activities | **Superseded** — applied the pre-2019 art. 5 c. 3. Use art. 128-sexies c. 3 TUB for group separation instead |
| art. 115 TULPS: *pubblici incanti* is **Questura** competence, not a Comune SCIA | **Medium-high** — SUAP guidance; Brescia unverified |
| art. 36-bis c. 3 DPR 380/2001 requires a *dichiarazione del professionista abilitato*; **art. 36 does not** | **High** |
| art. 3 c. 5 lett. e) D.lgs 231/2007 — mediatori immobiliari are soggetti obbligati | **High** |
| The mediation contract is *void* | **Unverified** — rely on artt. 6/8 + SU 19161/2017, which reach the same commercial place with a citation that holds. Do **not** cite art. 2231 c.c.; mediazione is an *attività d'impresa* on a registro, not a professione on an albo |
| art. 2 c. 6 L. 247/2012 and Cass. pen. VI 18734/2025 | **High** — but a contrary civil line exists, mostly pre-2012 |
| SU 11545/2018 *atti relativamente liberi* framework | **High** |
| Geometra/tecnico reserve attaches to the *signed* act, not the opinion | **Medium-high** — DOCFA/PREGEO article reference unverified; practice uniform |
| art. 5 c. 3 wording is *"e comunque in situazioni di conflitto di interessi"* | **High** — an earlier draft misquoted this as "ogni altra situazione" |
| C-242/23 does **not** mean the domestic text survives pending amendment — courts must disapply | **High** |
| art. 490 c.p.c. omission of the debtor; Garante 1490838/2008, 10063581/2024, 10168204/2025 | **High** |
| Auction data is **not** art. 10 GDPR, subject to the *abusi edilizi* caveat | **Medium** — caveat is my analysis, no authority found |
| art. 115 TULPS covers *assistenza aste* | **Medium** — CCIAA Roma classification; **unverified for Brescia** |
| Auction assistance as *procacciamento* inside L. 39/1989 | **Medium** — analysis of settled premises, no parere or case law on point |
| Whether Mundida actually holds the REA registration | **Unverified — and it is item 1** |
| AML obligations for the group; AI Act as applied to the AVM and the Aste report | **Unresearched** |

**Not verified against Normattiva** — unreachable this session. Re-pull L. 39/1989, artt. 1754–1755
c.c., art. 2 L. 247/2012, artt. 490 / 571 / 579 c.p.c. before relying on any of it in a dispute.

---

## §9 Working rules

**Claude — R&D.** Designs, specifies, writes briefs. No production code, no merges. Every brief names
the **T04 row** it touches and, for Aste, the reserve in §3 it engages.

**Cursor — production floor.** **Refuse and escalate** anything in T04 rows 10–12, anything that
prices as a percentage of or contingent on a sale, anything that emits *sanabilità* or a generated
legal risk conclusion without a countersigning professional, and anything that stores unredacted
debtor data — **even if the brief asks for it.** A brief that contradicts this file or T04 is a defect
in the brief.

**Aziz — plant manager and QA.** The boards, the merges, and every item in §7.

- **T04 is the matrix; this file is the delta.** If they conflict on the portal product, T04 wins on
  the rows it covers and this file governs the premise underneath it.
- **Source-of-truth order:** `CLAUDE.md` → `docs/legal/*` → code → `docs/audits/*` → `docs/*`.
- **Schema-enforced, not discipline-enforced.** Redaction at ingest, flat-fee pricing and the AI
  refusal boundaries are code and fixtures, not review conventions.
- **`signedBy` records capacity.** Never collapse product-owner and counsel sign-off into one boolean.
- **Report back.** Append `## R&D FEEDBACK — for Claude` to every PR: brief adherence · where the
  brief failed you · repo reality check · effort signal · blocked / needs a human · what the next
  brief should account for. This repo already runs that loop well — `docs/audits/` is the best
  feedback archive in the portfolio. Keep it.

---

*Engineering constraint document derived from research, not legal advice. §7 items need Italian
counsel; item 1 needs only a visura and should be done today.*

*v1 · 25 August 2026 · Pattern: Tamia4Life → SV LMS → Banks4All → IoVolo → EasyCasa.*
