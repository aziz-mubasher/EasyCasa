# EasyCasa — System Design: Unbundled Licensed Agency for Sale & Rent

**Status:** design blueprint (pre-build) · **Scope:** domain model, service catalog, the four roles, lifecycle state machines, and the Italian compliance layer · **Builds on:** the existing NestJS API + Postgres/PostGIS stack (Phases 0–6) and the universal app (Phase 7).

> **Not legal advice.** This maps *publicly documented* Italian requirements into engineering artifacts. Validate the regulatory design with a notaio, a commercialista, and legal counsel before launch — especially AML procedures, the mandate wording, and any tax-registration automation.

---

## 1. Positioning: what EasyCasa is, and isn't

The three portals you referenced sit in two different businesses:

- **idealista.it / immobiliare.it** are **listing portals** — aggregators that sell visibility and leads to agencies and private sellers. They don't hold the transaction.
- **zillow.com** is a portal too, but adds a **valuation engine (Zestimate)**, saved-search alerts, rich media, and lead routing to agents.
- **dove.it** is the closest analog to EasyCasa: a **licensed online agency** that pairs technology with local agents, uses a scientific valuation, runs a disciplined centralized process, and charges a **transparent, reduced** fee rather than the traditional ~3%.

EasyCasa's differentiator is the **unbundling**: it holds the *mediazione* authorization itself, and exposes the agency's activities as an **à la carte service catalog**. The owner pays **only for what they use** — a documents check, a valuation, professional photos, viewings, full mediation, contract registration — or buys a **package** that bundles them up to *chiavi in mano* (turnkey). Regulated steps are executed by EasyCasa's own enrolled mediatori or by **authorized external professionals** (notaio, tecnico abilitato, other agenti) orchestrated through the platform.

So EasyCasa is simultaneously: a **portal** (seekers browse), an **agency** (it mediates and closes), and a **marketplace of professional services** (owners assemble what they need). The system design has to serve all three without the compliance obligations of the agency leaking away just because a task was bought individually.

---

## 2. The service catalog (the core primitive)

Every traditional agency activity becomes an independently orderable **ServiceCatalogItem**, tagged by (a) who may legally perform it, (b) how it's priced, and (c) whether it gates a lifecycle transition. This table is the heart of the product.

| Service | Performed by | Pricing model | Compliance gate |
| --- | --- | --- | --- |
| Listing publication (self-serve) | Automated + owner | Fixed / free tier | **APE required before publish** |
| Property valuation (AVM + agent review) | AVM + mediatore | Fixed | — |
| Document check-up (*fascicolo*) | EasyCasa ops | Fixed | Produces the compliance checklist |
| Catasto retrieval (visura + planimetria) | Authorized provider | Fixed pass-through | Feeds conformità check |
| Conformity survey (catastale + urbanistica, RTI) | Tecnico abilitato (external) | Fixed / quote | **Blocks rogito if non-conforme** |
| APE issuance | Certified tecnico (external) | Fixed | Unblocks publish |
| Professional photos / floor plan / virtual tour | Photographer (external) | Fixed | — |
| Viewings management | Mediatore / owner | Included in mediation, or fixed | — |
| Full mediation (offer → close) | Enrolled mediatore | **Provvigione %** or fixed | Provvigione matures on *conclusione affare* |
| Proposal & preliminare handling | Mediatore | Included in mediation | — |
| Rogito coordination (with notaio) | EasyCasa + notaio (external) | Fixed coordination + notaio fee | — |
| **Rent** — contract drafting (type-aware) | EasyCasa | Fixed | Correct type: 4+4 / 3+2 / transitorio / studenti |
| **Rent** — RLI registration + cedolare secca | EasyCasa (as agent) | Fixed + pass-through taxes | **Within 30 days**; APE attached |
| **Rent** — tenant screening / KYC | EasyCasa | Fixed | AML *adeguata verifica* |
| Post-sale / post-registration admin (proroghe, risoluzioni) | EasyCasa | Fixed | RLI *adempimenti successivi* |

**Packages** are curated bundles over this catalog:

- **Fai-da-te** — self-serve listing + document check-up + AVM. Owner runs their own viewings.
- **Assistito** — adds full mediation (an enrolled mediatore handles offers, negotiation, preliminare) at a reduced, transparent fee.
- **Chiavi in mano** — end-to-end: conformity + APE + media + mediation + rogito coordination.
- **Affitto Sereno** (rentals) — drafting + RLI registration + cedolare secca option + screening, with optional rent-collection add-ons.

The billing engine must handle three coexisting revenue types on one order: **fixed service fees**, **percentage provvigione**, and **pass-through** costs (taxes, notaio, external-pro quotes). Every fee is shown before purchase — transparency is the brand.

---

## 3. The four roles (three portals + back office)

### 3.1 Owner / Seller portal — *Proprietario*
The workbench for putting a property on the platform and driving its process.
- **Onboard property** — a distinct `Property` object (owner-side, private) separate from the public `Listing`.
- **Guided *fascicolo* upload** — a document intake wizard that knows the Italian checklist and validates as it goes (see §5). It tells the owner exactly what's missing and what it blocks.
- **Assemble services / pick a package** — the catalog with live pricing.
- **E-sign the mandate** — *incarico di mediazione* or *mandato a titolo oneroso* (see §5.2), via qualified/advanced e-signature with SPID/CIE identity.
- **Process tracker** — a timeline/kanban of service tasks with status, assigned professional, and deliverables.
- **Offers & messaging** — see incoming *proposte d'acquisto* / rental applications; chat with EasyCasa and counterparties.

### 3.2 Seeker portal — *Acquirente / Conduttore* (this is the Phase 7 app)
- **Map-first search** (Zillow/idealista-grade): filters, boundary/bbox search, clustering.
- **Saved searches + push alerts**, favorites (already scaffolded in Phase 7).
- **Listing detail** with media, AVM-informed price context, virtual tour.
- **Book viewings**, submit a **proposta d'acquisto** or **rental application**.
- **KYC** on serious intent (AML trigger), **firma** for the proposal.
- **Their process tracker** — follow an accepted offer through preliminare → rogito, or an application → contract → registration.

### 3.3 Professional portal — *Agente / Tecnico / Notaio / Fotografo*
The supply side that makes unbundling legal and scalable. External professionals must be **authorized** for their operation.
- **Credential vault** — REA enrolment (for mediatori), *ordine/albo* registration (tecnici, notai), RC insurance, geographic coverage. Admin verifies before activation.
- **Assignment inbox** — geo-routed tasks (valuation, APE, conformity, viewings, mediation).
- **Deliverable upload** — signed reports, APE PDF, RTI, photos — which flow back into the *fascicolo* and unblock gates.
- **Calendar & availability**, payout tracking.

### 3.4 Admin / Back office — *EasyCasa Operations*
The orchestration and compliance brain.
- **Workflow orchestration** — assign professionals, verify documents, approve gates.
- **Service-catalog & pricing management** — items, packages, regional pricing.
- **Compliance registers** — AML/KYC cases, mandates, RLI submissions, provvigione ledger.
- **Billing & invoicing** — fixed fees, provvigione, pass-throughs; e-fattura via SdI.
- **Reporting** — funnel, time-to-sell, professional SLAs, revenue by service.

---

## 4. Lifecycle state machines

### 4.1 Property / Listing
```
Draft
  → FascicoloIntake          (owner uploads documents)
  → ComplianceReview         (ops + tecnico verify; APE, conformità)
  → ValuationReady           (AVM + agent review)
  → Published                (GATE: APE present)  ──► public Listing goes live
  → UnderNegotiation         (proposal accepted)
  → Closing                  (preliminare → rogito)
  → Sold  |  Archived  |  Withdrawn
```
Publication is **gated on APE**; the *rogito* transition is **gated on catastale + urbanistica conformity**. A property can be `Published` while conformity work proceeds in parallel, but it cannot reach `Closing`'s completion without it.

### 4.2 Sale transaction
```
ProposalSubmitted → ProposalAccepted → Preliminare (optional RAP registration)
  → [Mutuo pending?] → Rogito (notaio) → Completed
                                       └► Provvigione matures (conclusione affare)
```

### 4.3 Rental transaction
```
ApplicationSubmitted → Screened(KYC/AML) → Selected
  → ContractDrafted(type) → Signed
  → RLI Registered (≤30 days) [+ cedolare secca option] → Active
  → Renewals / Rinegoziazione / Risoluzione  (RLI adempimenti successivi)
```

### 4.4 Service task (runs under any of the above)
```
Requested → Assigned(pro) → InProgress → Delivered → Approved → Billed
                                        └► Rejected → back to InProgress
```

---

## 5. The Italian compliance layer

This is where "in accordance with the Italian bureaucratic system" gets concrete. Each item below is a first-class system feature, not a footnote.

### 5.1 The *fascicolo dell'immobile* (document engine)
A validated document set per property. Publication and closing gates read from it.

| Document | Rule the system enforces |
| --- | --- |
| Atto di provenienza | Required for closing |
| Visura catastale | Recent; identifies foglio/particella/subalterno, rendita |
| Planimetria catastale | Must match state of fact (**conformità catastale**) |
| Conformità urbanistica / RTI asseverata | Titoli edilizi (CILA/SCIA/Permesso) align with reality; **gates rogito** |
| **APE** | **Mandatory from the moment the listing is published**; validity 10 years; attached to rental contracts |
| Agibilità / abitabilità | Flagged if absent; buyer must accept formally |
| Certificazioni impianti | Collected where applicable |
| Documentazione condominiale | Required in condominio |
| IDs, CF, regime patrimoniale, successione | Party verification |

The engine models each `DocumentType` with: required-for (publish/rogito/rental), validity window, whether a professional deliverable satisfies it, and the gate it unblocks.

### 5.2 Mandate: *mediazione* vs *mandato a titolo oneroso*
Italian law distinguishes the neutral **mediatore** (Art. 1754 c.c.; provvigione due by both parties on *conclusione dell'affare*) from the **agente con mandato a titolo oneroso** who acts on paid instruction of one party. EasyCasa's à la carte model — where the owner pays for specific services — leans toward the **mandate** figure for those services, while full mediation follows the *mediazione* rules. The system stores the **signed incarico**, its type, exclusivity, duration, and fee structure, because *which figure applies determines how and from whom fees may lawfully be charged*. This must be reviewed by counsel and reflected in the catalog's compliance tags.

### 5.3 Agent authorization (who may act)
Under **Legge 39/1989**, real-estate mediation requires enrolment: since the *Ruolo* was abolished (D.Lgs 59/2010), it's a **SCIA** filed via *Comunicazione Unica* to the Camera di Commercio and recorded in the **REA** (special section of the Registro Imprese, ATECO 68.31), plus **requisiti morali + professionali** and mandatory **RC professional insurance**; every *preposto* who mediates must be registered. The **Professional portal's credential vault** models exactly these attributes and **blocks assignment** of a mediation task to anyone whose REA enrolment / insurance isn't verified and current.

### 5.4 AML — *antiriciclaggio* (D.Lgs 231/2007)
Estate agents are *soggetti obbligati*. The platform implements:
- **Adeguata verifica della clientela (KYC)** at defined triggers (mandate signing, accepted proposal, contract).
- **Risk profiling**, PEP/sanctions screening, and **record retention**.
- A path to file **SOS (segnalazione operazioni sospette)** to the UIF, managed from the back office.

### 5.5 Rental registration (Agenzia delle Entrate — RLI)
Leases over 30 days must be **registered within 30 days** of signing (or start, if earlier) via **RLI / RLI-web**, paying *imposta di registro* + *bollo*, with the **cedolare secca** option available (and APE attached to the contract). Note the load-bearing fact for EasyCasa: **agents are obliged to register telematically**. The system therefore:
- Generates a correct, type-aware contract and the **RLI payload**.
- Runs a **30-day countdown** with escalation.
- Handles **adempimenti successivi** (proroga, cessione, risoluzione, subentro, rinegoziazione).
> **Integration caveat:** RLI submission runs through the Agenzia's telematic channels (Entratel/Fisconline, SPID/CIE), not an open public REST API. Expect an **intermediary-mediated or assisted** submission (generate the file/payload; submit via the authorized telematic channel) rather than a silent server-to-server call. Confirm the exact channel with a commercialista.

### 5.6 Money, invoicing, and transparency
- **Provvigione** matures on *conclusione dell'affare* — the ledger ties it to the transaction state, not to task delivery.
- **E-fattura** via the **SdI** for all fees.
- Surface buyer-relevant facts (e.g. the **19% IRPEF detraction on provvigione, up to €1,000**, for first-home buyers) in the UI as informational.
- **GDPR** across the board; catasto and identity data minimization and retention policies.

---

## 6. Data model — additions to the existing schema

Prior phases already provide `Listing`, taxonomy, `User`/`Agent`/membership, favorites, saved searches, messaging, QR, media. Phase 8 adds (names indicative):

- **Property** — owner-side private object; 1:1 (or 1:N) with public `Listing`.
- **DocumentType / DocumentAsset** — the *fascicolo*; validity + gate metadata.
- **ComplianceCheck** — computed gate state (publishable? closable?).
- **ServiceCatalogItem / Package / ServiceOrder / ServiceTask** — the catalog and its execution.
- **Professional** — externals; credentials, coverage, insurance, verification state.
- **Assignment** — task → professional, with geo-routing and SLA.
- **Mandate (Incarico)** — type, exclusivity, duration, fee terms, signed doc.
- **Proposal** — *proposta d'acquisto* / rental application; caparra terms.
- **Transaction** — sale or rental; state machine; links to preliminare/rogito or lease.
- **LeaseRegistration** — RLI payload, dates, cedolare secca flag, tax amounts, deadline clock.
- **KycCase** — AML verification, risk score, screening results, SOS linkage.
- **LedgerEntry / Invoice** — fixed fee / provvigione / pass-through; SdI status.

All of it stays behind the **single NestJS API contract**, consumed by the universal app (owner + seeker portals), a back-office admin, and the professional portal — reusing `@easycasa/api-client`.

---

## 7. What to borrow from each reference

| Reference | Borrow |
| --- | --- |
| **Zillow** | Map-first search UX, AVM (Zestimate → your AVM) surfaced as price context, saved-search alerts, rich media / 3D tours, "follow your process" clarity |
| **idealista / immobiliare** | Portal breadth and filter depth, listing-quality standards, lead/enquiry flows, private-vs-agency listing handling |
| **dove.it** | The unbundled, transparent-pricing thesis; tech + local-agent orchestration; centralized, disciplined process (marketing → qualification → dedicated mediatore); scientific valuation; outsourcing specialist tasks (photography, conformity) while keeping tech/content/training in-house |

EasyCasa's synthesis: **dove.it's disciplined agency model, but unbundled into a Zillow-grade self-serve product**, with the portal reach of idealista/immobiliare feeding the funnel.

---

## 8. Recommended build order (Phase 8+)

1. **Service catalog + pricing + packages** — the commercial primitive; also unblocks the owner portal.
2. **Property + *fascicolo* document engine + compliance gates** — the compliance spine; APE/conformity rules.
3. **Owner portal MVP** — onboard, upload, buy services, sign mandate, track.
4. **Professional portal + admin orchestration** — credential verification, assignment, deliverables.
5. **Rentals: contract + RLI + cedolare secca + AML/KYC** — the highest-automation, highest-compliance win.
6. **Sale closing: proposal → preliminare → rogito coordination + provvigione ledger + SdI**.
7. **Billing, reporting, and the transparency surfaces**.

Each layer is API-first and reuses the Phase 7 universal client, so the seeker app, owner portal, and back office share one contract.

---

## 9. Open decisions to confirm before Phase 8

- **Legal figure per service** — which catalog items are *mediazione* vs *mandato a titolo oneroso*, and the exact fee-attribution rules. **(Needs counsel.)**
- **RLI submission channel** — intermediary/Entratel vs assisted; who is the registering party of record.
- **Notaio network** — panel model vs owner's own notaio; how rogito coordination is scoped.
- **Professional onboarding bar** — verification depth for REA/insurance/albo before a pro can be assigned.
- **AML operating model** — in-house compliance officer vs outsourced; SOS workflow ownership.
- **Owner portal surface** — extend the Phase 7 universal app to owners, or a dedicated web back-office.

---

## Regulatory references (for the team to verify against)

- **Codice civile**, artt. 1754–1765 (mediazione, provvigione).
- **Legge 3 febbraio 1989, n. 39** and **D.M. 452/1990** (agenti di affari in mediazione; requisiti; RC insurance).
- **D.Lgs 26 marzo 2010, n. 59** (abolition of the *Ruolo*; SCIA/REA regime) and **D.M. 26 ottobre 2011**.
- **D.Lgs 21 novembre 2007, n. 231** (antiriciclaggio; obligations of estate agents).
- **DPR 26 aprile 1986, n. 131** (imposta di registro) and **Agenzia delle Entrate — RLI / RLI-web** (lease registration; cedolare secca).
- **APE** — energy performance certificate obligations (mandatory from listing; attached to leases).
- Conformità **catastale** and **urbanistica** requirements; **RTI** asseverata (dual conformity) for sale.
