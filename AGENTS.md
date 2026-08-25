# EasyCasa — Agent instructions

## Mandatory constraint load

Before designing, specifying, or building **anything** in this repository, read and follow:

**[`CLAUDE.md`](./CLAUDE.md)** — venture constraint set (legal / product / Aste / data).  
It is not background reading.

Also load the governing matrix it deltas against:

- [`docs/legal/T04_mediazione_boundary.md`](./docs/legal/T04_mediazione_boundary.md)
- Aste counsel packet: [`docs/legal/aste-counsel-addendum-lgl1.md`](./docs/legal/aste-counsel-addendum-lgl1.md)

### Cursor production-floor refusals (from CLAUDE.md §9)

Refuse and escalate — even if a brief asks for it:

- T04 rows **10–12** (offers / *proposta* / *caparra* / negotiation advice)
- Any fee that is a **percentage of or contingent on a sale**
- Emitting **`sanabilità`** or a generated legal risk conclusion without a countersigning professional
- Storing **unredacted debtor / third-party PII** from auction dossiers

A brief that contradicts `CLAUDE.md` or T04 is a defect in the brief.

### Source-of-truth order

`CLAUDE.md` → `docs/legal/*` → code → `docs/audits/*` → `docs/*`

### Sign-off capacity

Never collapse product-owner and counsel into one boolean. Prefer `signedBy: AZM` vs `signedBy: counsel`.

## Engineering conventions

See `.cursor/rules/00-general.mdc` (and `10-api`, `20-web`, `30-ai`, `40-azm-bridge`).

## Cursor Cloud

Follow `docs/deploy.md` for VPS deploys. Do not flip public `ASTE_ANALYSIS_ENABLED` without the G2 / counsel gate in the runbooks.
