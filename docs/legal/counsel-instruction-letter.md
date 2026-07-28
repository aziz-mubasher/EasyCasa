# Istruzioni al legale — EasyCasa (MUNDIDA S.r.l.)

**Data** 28 luglio 2026  
**Da** [nome], MUNDIDA S.r.l. — P.IVA IT04531990986  
**Oggetto** Pareri e testi necessari prima dell'apertura del pilota  

*(English working copy below the Italian header for internal use — send whichever
version your counsel prefers.)*

---

## Engineering note (read before answering)

This letter is the **instruction brief** for counsel. The companion engineering
package is [`COUNSEL-REVIEW-PACKAGE.md`](./COUNSEL-REVIEW-PACKAGE.md) (what the
system actually does).

**Correction to §1 “Where we are”:** the product intent is pre-launch / seeker
pilot, but production already serves Contatta (enquiry) with consent ledger
rows at `policyVersion: "v1-draft"`. Treat live personal-data collection as
**possible today**; do not assume a cold start with zero records. See package
§1.6 Q1.

---

## 1. Context you need before answering anything

**What we are.** MUNDIDA S.r.l. operates **EasyCasa** (easycasaita.com), an
Italian residential property marketplace. Our positioning is *commission-free*:
we intend to charge property owners nothing, and to earn from fixed-fee services
to buyers and owners rather than from a percentage of the sale price.

**Where we are.** Pre-launch positioning. The platform is built. See the
engineering note above on Contatta / `v1-draft` consents before assuming zero
live processing.

**Pilot scope.** A "seeker" path only: map search → listing detail → enquiry →
viewing booking → GDPR self-service. Owner transactions, payments, AML,
e-invoicing and e-signature are built but deliberately out of pilot scope.

**Group structure.** MUNDIDA also operates **Banks4All**, a separate legal entity
providing independent financial advisory. Banks4All takes no commission from
banks or intermediaries; credit intermediation itself is carried out by a
separate OAM-registered entity. Items 5, 6 and 7 below concern the interaction
between the two companies.

**What we are not asking for.** We are not asking for a general compliance
review. Each item below is a specific decision we cannot take ourselves, with a
statement of what we would do with each possible answer.

---

## 2. The items

### Priority A — blocks opening the pilot

**A1. Privacy policy, cookie banner, and the enquiry consent gate.**
The enquiry form requires two ticked consents before the API will accept a
submission: privacy and mediation. Consents are written to an immutable ledger
with a policy version. DSAR export and erasure (with legal hold on converted
enquiries) are implemented.

*We need:* approved IT/EN/ES policy text; confirmation that the two-consent
structure satisfies Art. 6–7 GDPR and Garante guidance for this use case;
cookie banner requirements for our stack.
*Currently:* policy exists as `v1-draft`, unsigned. We cannot open without this.

**A2. Provvigione disclosure and the incarico template.**
Our understanding — please confirm or correct — is that no Italian law fixes a
minimum commission; that art. 6 L. 39/1989 leaves the rate to agreement between
the parties; that AGCM Provvedimento 13035/2004 excluded tariffs from this
sector; and that the ~3% figure derives from CCIAA *usi* which apply **only in
the absence of written agreement**, with art. 1755(2) c.c. as the fallback.

*This is the single most commercially important question in this letter.* If
correct, our fixed-fee model is sound and the operative protection is simply that
every mandate states the rate in writing. If we have it wrong, our pricing and
our public marketing both need to change before launch.

*We need:* confirmation of the above; an incarico template with the rate field
mandatory; and approved disclosure copy for the site.

**A3. Legal identification on the site.**
Please confirm exactly what must appear and where — sede legale, P.IVA, REA
number, iscrizione for mediation activity, PEC. Currently absent.

**A4. Mediation enrolment coverage.**
Confirm which provinces MUNDIDA's current mediation enrolment permits us to
operate in, and what is required to extend it. We intend to pilot in Milan and
expand.

### Priority B — blocks specific features, not the pilot

**B1. Buyer financing badge — approved wording (IT/EN/ES).**
On an enquiry or viewing request, the owner may see that the buyer's
affordability has been assessed by Banks4All: a status, an indicative maximum
band, and a validity date. No income, employment, bank or credit data is
transmitted or stored.

Our draft, for your correction:

> **Affordability assessed** · Banks4All — indicative range up to €325,000 ·
> valid to 27 Jan 2027.
> *Independent affordability assessment. Not a credit offer, approval or
> commitment by any lender. Banks4All and EasyCasa are both part of the Mundida
> group.*

*We need:* confirmation the "not a credit offer" qualifier is sufficient and
correctly placed given Banks4All is advisory and not a lender; and confirmation
that the group-affiliation line adequately discloses the relationship.

**B2. Consent text for sharing financing status.**
Recorded as a distinct, separately withdrawable purpose:
*"Share my Banks4All affordability assessment with the property owner."*
*We need:* approved wording, and confirmation this cannot be bundled with the
general enquiry consent.

**B3. Intra-group data sharing agreement, EasyCasa ↔ Banks4All.**
Two separate legal persons under common ownership. Our working assumption is
**independent controllers** rather than joint controllership under Art. 26 —
Banks4All controls the financial assessment, EasyCasa controls the marketplace
record, and the exchange is a disclosure. Please confirm or correct, and draft
the agreement accordingly.

**B4. Property valuation data — OMI licensing.**
We use Agenzia delle Entrate OMI quotations (free download, attribution
mandatory) to generate indicative €/m² valuations shown to users. The publisher's
terms require source attribution but do not expressly address commercial reuse.

*We need:* whether displaying derived valuations in a commercial product is
permitted under those terms; what attribution is required and where; and whether
a convention with the Agenzia is advisable. We are content to be conservative —
if the answer is uncertain, we will restrict the feature rather than argue.

**B5. Foreign-buyer service page — three specific claims.**
A marketing page aimed at non-resident buyers. Three statements need checking:

- **Reciprocity.** We state that buyers from the UK, US, Canada, Australia,
  Switzerland and most of Latin America can purchase in Italy. Please verify and
  supply a correct list, or tell us to state it generally.
- **Tax estimate.** We state that a €300,000 second home attracts roughly
  €9,000–13,000 in taxes and notary fees. Please correct or bound this.
- **Comparative claim.** We compare our fixed fee against a customary 3% + IVA
  agency commission, attributing the 3% to CCIAA usage tables. Please confirm
  this is substantiable comparative advertising and not an unfair commercial
  practice.

**B6. Service catalogue classification.**
Roughly twenty catalogue items (document checks, surveys, APE issuance, lease
drafting, RLI registration, mediation, viewing accompaniment) each carry a
`legal_basis` field currently defaulted to `REVIEW_REQUIRED`. The system blocks
sending a mandate until every item on it is classified.

*We need:* each item classified as mediation activity, ancillary service, or
regulated activity requiring a separate licence — and flagged where an item
cannot be performed by MUNDIDA directly and must be brokered to a credentialed
professional.

---

## 3. What we would like back, and in what form

1. **A short written opinion on A2 first**, ahead of everything else. It
   determines our pricing and our public positioning, and every other item is
   cheaper to answer once it is settled.
2. **Drafted text** for A1, A3, B1, B2 — in Italian, with English and Spanish
   translations we can have checked separately.
3. **Drafted agreements** for A2 (incarico) and B3 (intra-group).
4. **Yes/no with reasoning** for B4, B5, B6.

Where an item is uncertain, we would rather have the conservative answer and a
note on what would make it certain, than an optimistic one. We have no users yet
in the commercial sense of a marketed pilot — but see the engineering note on
existing Contatta / `v1-draft` records — so restricting a feature costs us little
today and a great deal after a full launch.

## 4. Practical

- **Timing.** A1–A4 gate our opening. We would like those within [X] weeks.
  B1–B6 can follow.
- **Budget.** Please indicate an estimate before starting, and flag if any item
  needs a specialist (data protection, advertising, or real-estate regulatory).
- **Contact.** [nome], [email], [phone].
- **Attachments.** See [`counsel-send-checklist.md`](./counsel-send-checklist.md).

---

*Prepared internally. This is an instruction letter, not legal analysis — every
proposition above marked "our understanding" is stated to be corrected.*
