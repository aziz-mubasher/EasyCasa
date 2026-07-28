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
