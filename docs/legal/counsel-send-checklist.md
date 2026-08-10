# Counsel send checklist — EasyCasa

Use with [`counsel-instruction-letter.md`](./counsel-instruction-letter.md).
Fill `[nome]`, `[email]`, `[phone]`, and timing `[X]` weeks before sending.

## Core package (always attach)

| # | Document | Path / URL |
| --- | --- | --- |
| 1 | Instruction letter (this brief) | `docs/legal/counsel-instruction-letter.md` |
| 2 | Engineering / DPO review package | `docs/legal/COUNSEL-REVIEW-PACKAGE.md` |
| 3 | Privacy policy draft (`v1-draft`) | `docs/legal/privacy-policy.md` · live: https://easycasaita.com/it/legal/privacy |
| 4 | Mediation disclosure draft | `docs/legal/mediation-disclosure.md` · live: https://easycasaita.com/it/legal/mediation |
| 5 | **EC-S-T02** Sell Privately claims packet | `docs/legal/ec-s-t02-counsel-review-packet.md` · live page: https://easycasaita.com/it/vendi-da-privato |
| 6 | **EC-S-T04** Mediazione boundary matrix | `docs/legal/T04_mediazione_boundary.md` |
| 7 | **EC-S-T05** Seller-side data / informativa extension | `docs/legal/ec-s-t05-seller-data-memo.md` |

## Priority A attachments

| Item | Material |
| --- | --- |
| A1 | Privacy + mediation drafts above; Contatta consent UI (`apps/web/src/components/listings/ContactEnquiryForm.tsx`); package §1.2–1.3 (consent ledger, DSAR) |
| A2 | Mediation disclosure draft; fee / incarico questions in letter §A2 |
| A3 | Current site footer / legal pages (placeholders) — confirm what is missing |
| A4 | MUNDIDA mediation enrolment certificate / REA extract (**human attachment — not in repo**) |

## Priority B attachments

| Item | Material |
| --- | --- |
| B1–B2 | Banks4All integration note: `docs/banks4all-integration.md` (+ annotated reply if useful: `docs/banks4all-integration-response-v0.1-R.md`); live badge copy in `apps/web/messages/{it,en,es}.json` under `viewings.b4a*` and enquiry form |
| B3 | Same Banks4All note — controller / data-minimisation assumptions |
| B4 | OMI import docs: `docs/omi-import.md`, `docs/RUNBOOK-omi-vps-load.md` |
| B5 | Foreign-buyer page: https://easycasaita.com/it/acquisto-assistito · source `apps/web/src/components/services/AcquistoAssistitoPage.tsx` + `apps/web/messages/*/acquistoAssistito` (or equivalent keys) |
| B6 | Service catalogue: DB enum `legal_basis` = `mediazione` \| `mandato_oneroso` \| `review_required` (`migration/sql/0009_phase10.sql`); seed rows in `migration/sql/0016_phase24.sql` and any admin-edited production rows — **export live `service_catalog_items` before send** |
| B7 | Internal CRM gate: `docs/crm.md`; company responsibility `docs/legal/crm-controller-responsibility.md`; package §1.6 Q2a + RoPA row in §1.1 C; draft informativa `privacy-policy.md` §8; env `CRM_ENABLED` / `CRM_DORMANT_RETENTION_MONTHS` in `docs/env.md` |
| **EC-S** | Sell Privately counsel: T02 packet + T04 matrix + **T05 seller-data memo** (core package rows 5–7); Banks4All badge copy cross-ref B1–B2 |

## Do not send

- `.env` / partner tokens / SMTP credentials
- Production DB dumps
- Banks4All partner bearer tokens

## After counsel returns

1. Replace `v1-draft` texts and bump `policyVersion` in API + web.
2. Apply A3 identification to footer / impressum.
3. Classify catalogue `legal_basis` (B6) so mandates can send.
4. Update badge / consent copy (B1–B2) only after sign-off.
5. Record decisions in this folder (date + counsel name) — do not treat drafts as approved until then.
6. B7 / §1.6 Q2a **consent applied** 2026-08-02: ops may set `CRM_ENABLED=true`
   in the production `.env` (repo/code default stays `false`). When counsel returns
   polished §8 copy, merge into live privacy surfaces and bump `policyVersion`.
7. **EC-S-T02/T04:** after sign-off, flip `promises.json` blocks to `live` only with the
   deliberate guard-test update described in `ec-s-t02-counsel-review-packet.md`
   (process note). Do not bypass `validateLedger`.
8. **EC-S-T05:** after Layer 1 + version approval, stamp policy version for T30 and
   unlock T06. Do not open seller document/media/messaging collection until the
   ship gates in `ec-s-t05-seller-data-memo.md` §7 are checked.
