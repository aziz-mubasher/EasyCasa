# EC-15 — Demo environment

**Repo** `aziz-mubasher/EasyCasa`
**Purpose** Show stakeholders what EasyCasa is, using data that demonstrates the
differentiators rather than a generic portal.
**Replaces** Casafari-derived listings on any public URL. Casafari stays in use for
comps, pricing validation and market research — not as inventory.
**Size** One run. Seed script is the bulk of it.

---

## Step 0 — Pre-flight

```bash
ls migration/sql/ | tail -3
ls docker-compose*.yml && grep -n "admin\|web\|api" docker-compose.yml | head -30
grep -rn "omi_quotes\|omi_zone_quotes" apps/api/src -l
grep -rn "OUTBOX\|BREVO\|STRIPE" apps/api/src infra/ -l | head
grep -rn "casafari" . --include=*.ts --include=*.tsx --include=*.sql -l
```

Report the last one specifically: **where Casafari-derived listings currently
live**, and whether any are reachable on a public production URL.

---

## Why not just seed production

Two reasons, and the second is the one that matters.

**Casafari listings demonstrate a portal, not EasyCasa.** They have no verified
owner, no Verified Buyer Badge, no APE, no response rate, no OMI band beside the
price. As demo data they specifically fail to show what makes the product
different — a stakeholder sees a competent search interface and no reason to care.

**On a public URL they are indistinguishable from the problem we exist to solve.**
A real seeker enquires, nobody can show them the flat, and the authenticity
promise is false on day one. Google indexes them against real addresses.

## Part 1 — Isolation

Non-negotiable, because the failure modes are bad.

- **Separate Compose stack, separate database, separate MinIO bucket.** Demo data
  must have no path to production. Not a flag on the same stack.
- `demo.easycasaita.com` behind Traefik, with `X-Robots-Tag: noindex, nofollow`
  set at the proxy **and** a meta tag, **and** `robots.txt` disallowing everything.
  Three layers because one gets forgotten.
- **Permanent, non-dismissible banner** on every page:
  *"Ambiente dimostrativo — gli immobili non sono reali."* Not a toast, not a
  cookie-dismissed bar.
- **No outbound messages, ever.** Outbox in dry-run: emails, WhatsApp and SMS
  render to a log or an in-app inbox and go nowhere. A demo that emails real
  people is the worst possible outcome here.
- Stripe in test mode. Banks4All attestation calls stubbed, not pointed at their
  staging.
- Optional basic auth. Recommended if a link will be shared; noindex plus the
  banner is the minimum.

## Part 2 — OMI-anchored synthetic listings

The trick that makes this credible: **price every listing inside the real OMI band
for its actual zone.**

You have the national dataset loaded. A Milan trilocale at €3,765/m² sits
plausibly inside the comune band, so when the listing page shows the band beside
the price, the comparison *makes sense* — which is exactly what a scraped listing
can't do.

`pnpm demo:seed`, **deterministic** — a fixed PRNG seed, so every reset produces
byte-identical data. The demo script references specific listings by name and
reference; those must not move between runs.

- ~120 listings: mostly Milan across several real OMI zones so the map isn't one
  cluster and the price variance is genuine, plus a handful in Monza, Bergamo and
  Cremona
- Realistic surfaces, floors, years, energy classes, condominium fees
- Italian descriptions that read as written by an owner, not generated
- Every published listing has: verified owner, APE, OMI band, response rate

**Images.** AI-generated interiors or licensed stock. Never scraped. Note the
irony and respect it: AI-generated photos are the *scam signature* the
authenticity engine detects, so demo images must be flagged in metadata and must
never migrate to production seed data.

`pnpm demo:reset` — drop, migrate, seed. A botched demo recovers in a minute.

## Part 3 — Staged scenarios

Each one exists to prove one differentiator. Seed them deliberately, don't hope
they emerge.

| # | Scenario | Proves |
|---|---|---|
| 1 | Fully verified listing — SPID owner, APE, OMI band, 98% response, 2h median | The baseline promise |
| 2 | Listing blocked at publish — no APE, no title proof *(admin-visible only)* | Verification is real |
| 3 | Listing delisted for non-response after warnings | The promise has teeth |
| 4 | Enquiry from a badged buyer — initials, band, no surname | Qualified demand, no identity |
| 5 | Enquiry with no badge — **nothing rendered** | We don't mark down non-customers |
| 6 | Expired badge — disappears silently | Freshness is enforced |
| 7 | Confirmed viewing — both names and the exact address appear at once | Mutual, simultaneous reveal |
| 8 | Cremona: APE unavailable, 11 demand-log entries | We don't sell what we can't deliver |
| 9 | Milan: APE orderable, two certificatori | And where we can, we do |
| 10 | Takedown with recorded motivation *(admin)* | DSA compliance |
| 11 | DSAR with legal holds displayed *(admin)* | Erasure honesty |
| 12 | Credential expiring in 12 days *(admin)* | Operational vigilance |

Scenario 5 matters more than it looks. The instinct in a demo is to show the
badge working; showing that its **absence renders nothing** is what proves the
platform isn't a sales channel for a sister company.

## Part 4 — Demo script

`docs/demo-script.md`. Ten minutes, in this order, because it builds an argument
rather than touring features.

1. **Search.** Map, listings, energy class on every card.
   *"Every property here has an identity-verified owner. That's a precondition of
   publishing, not a badge."*
2. **Listing detail — the OMI band beside the asking price.** The moment of the
   demo.
   *"That's the official Agenzia delle Entrate range for this specific microzone.
   The asking price sits below it — and we tell the buyer to find out why."*
3. **Admin: the blocked listing.** *"Here's what didn't get published, and the
   reason."*
4. **Enquiry from a badged buyer.** *"The owner knows this person can fund it to
   €325,000. They don't know their surname, and they don't have their phone
   number."*
5. **Enquiry with no badge.** *"Nothing. We don't flag people for not using it."*
6. **Confirm the viewing.** *"Now both sides get the name and the address. At the
   same moment. Neither is exposed while the other stays anonymous."*
7. **Admin: coverage matrix.** *"Milan is covered. Cremona isn't, and eleven
   people have asked. That's our recruitment list, and it's why we don't sell
   there."*
8. **Valuation, logged out.** *"No account, no phone number, no callback. This is
   how owners find us — and it runs on the same official data."*

Steps 4–6 are the sequence to rehearse. That's the thesis: capacity visible,
identity invisible, until both sides choose.

---

## Validation

- Demo stack cannot reach the production database or bucket — verified by
  attempting it, not by inspection
- `noindex` present at proxy, in meta, and in `robots.txt`
- Banner renders on every route and cannot be dismissed
- No outbound email, WhatsApp or SMS leaves the demo stack under any action
- `demo:seed` twice produces identical data; every scripted reference resolves
- Every listing's €/m² falls inside its zone's OMI band
- All twelve scenarios reachable and matching the script
- Casafari-derived listings removed from any public production URL
- `demo:reset` completes in under two minutes
- Lint, typecheck, tests green

## Out of scope

Any change to production listing data beyond removing the imported set. New
product features. Performance work. Multi-language demo content — Italian only
for now; the EN and ES walkthroughs come once the script is settled.
