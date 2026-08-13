# EC-S Claim 1–2 live + G3 paid directory (2026-08-13)

**Authoriser:** AZM (product owner) via Cursor cloud agent — *proceed Claim 1–2 ledger → live; G3 row 9 → paid directory*  
**Date:** 2026-08-13  
**Parked (explicit):** VO/checklist/analytics flips, Bunny DPA, T05 §6.5/T25, housekeeping bundle.

## Claim 1–2 — ledger → live

| Item | Action |
|------|--------|
| `blocks.savingsFigures` | `fallback` → **`live`** |
| `blocks.mediazioneCopy` | `fallback` → **`live`** |
| `enforceCounselInterim` | Lifted (no-op) in `promiseLedger/index.ts` + `validate-promise-ledger.mjs` |
| `mediation-disclosure.md` | Rewritten to **portal framing** (no licensed-mediator template for sell-privately) |
| `mediationPage` ours.outro2 | IT/EN/ES aligned with portal / flat-fee wording |
| Packets | T02 Claim 1–2 boxes signed; T04 Claim 2 flip ☑ yes |

## G3 row 9 — paid directory

| Item | Decision / ship |
|------|-----------------|
| Legal form | Flat listing fee for directory presence (not % / not success-contingent) |
| Label (IT) | Banner `Elenco con presenza a pagamento — tariffa fissa`; badge `Presenza a pagamento` |
| Ordering | `paid_placement DESC`, then province/name |
| Tracking | Outbound UTM/referral params **still stripped** |
| Segnalatore | Not treated as *segnalatore* when limited to labelled directory listing |
| Eng | Migration `0064_ecs_g3_partner_directory_paid.sql`; API `paidPlacement`; web dual labels |
| Fee collection | Admin marks `paidPlacement` after flat fee (Stripe partner checkout = follow-up) |

## Deploy checklist

- [x] Apply `migration/sql/0064_ecs_g3_partner_directory_paid.sql` on VPS DB
- [x] Rebuild **web** (ledger + i18n + partner page) and **api** (schema/service) with Traefik overlay
- [x] Smoke: `/it/vendi-da-privato` shows EUR savings + portal copy; `/api/partners/directory` 200
- [x] Confirm parked flags still false: VO / checklist / analytics / CDN

**Post-deploy R&D report:** `docs/audits/EC-S-claim12-g3-rnd-report.md`
