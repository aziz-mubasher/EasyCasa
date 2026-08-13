# EC-S Claim 1–2 + G3 — completion R&D feedback (for Claude)

**As of tip `b88ec82` on `main` (PR #143) + VPS deploy 2026-08-13T19:57Z.** Full narrative: `docs/audits/EC-S-claim12-g3-rnd-report.md`.

## Merge + deploy

| Step | Result |
|------|--------|
| PR | [#143](https://github.com/aziz-mubasher/EasyCasa/pull/143) MERGED |
| `main` | `b88ec82` (VPS tip later `4879928` includes this + aste docs) |
| SQL | `0064` applied — `paid_placement` present |
| API + web | Rebuilt + force-recreated with Traefik overlay |

## What landed

| Track | Result |
|-------|--------|
| Claim 1–2 | `savingsFigures` + `mediazioneCopy` → **live**; interim guard lifted; mediation-disclosure portal reconcile |
| G3 row 9 | Signed; `paid_placement` + preferential sort + paid labels; tracking still stripped |
| Parked | VO/checklist/analytics, Bunny DPA, T25, housekeeping — untouched |

## Post-deploy smoke

| Check | Result |
|-------|--------|
| `/it/vendi-da-privato` | EUR `€7.500–€9.150` + portal copy in rendered HTML |
| `/it/legal/mediation` | Portal framing strings present |
| `/api/partners/directory` | 200 informational (empty catalogue — expected) |
| Parked flags | Still false |

## R&D FEEDBACK — for Claude

### 1. BRIEF ADHERENCE
- Flipped Claim 1–2 as authorised; reconciled `mediation-disclosure.md` before Claim 2 live.
- Signed G3 and **built** paid-placement (was not flag-gated — not previously implemented).
- Left parked items parked.

### 2. WHERE THE BRIEF FAILED YOU
- Ambiguous: “G3 → paid directory” implied ops flip; **paid variant was not built**. Implemented MVP: admin-marked `paidPlacement` + labels + sort. No partner Stripe checkout yet.
- Guess: fee collection offline/admin is enough for counsel-compliant labelled paid presence; Stripe can follow.

### 3. REPO REALITY CHECK
- Claim 1–2 flip is web ledger + dual validators + tests; requires **web rebuild**.
- G3 needs SQL `0064` + **api** image rebuild (schema) + web i18n/page.
- Traefik compose pair still required on recreate.
- Enquiry consent purpose key remains `mediation_disclosure` (historical name); content is portal disclosure.
- Empty paid catalogue keeps informational banner until admin marks a row paid.
- Grep sell-privately HTML after stripping `<script>` — fallback strings linger in the messages payload.

### 4. EFFORT SIGNAL
- Larger than a pure flag flip: Claim 1–2 docs/tests + G3 eng (migration/API/UI). Correctly one PR if product wants both gates closed together; could have been split.

### 5. BLOCKED / NEEDS A HUMAN
- Optional: Stripe Price for partner flat listing fee + self-serve checkout.
- Optional: seed paid directory entries / mark first paid partners in admin.
- External counsel may still amend Claim 1 EUR figures or Claim 2 wording later.
- Parked flips still need separate human gates.

### 6. NEXT TASK SHOULD ACCOUNT FOR
- Do not assume monetised directory was “behind a flag” — it needed schema (now shipped).
- Keep UTM strip unless counsel explicitly wants conversion tracking (G3 deliberately kept strip).
- Parked: VO / checklist / analytics / Bunny DPA / T25 — do not bundle into copy flips.
