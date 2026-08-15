# G1 — Two human actions to close the gate

**Date:** 2026-08-14 · **Owner:** AZM · **Time needed:** ~10 min (action 1) + ~15 min (action 2)  
**Context:** Extract set EC-29→34 merged + deployed (`fc64987`). Live 8/8 scored. G1 is blocked on exactly these two items.  
**Canonical scorecard:** `docs/audits/G1-post-ec34-rnd-report.md`  
**Reply channel:** paste the one-line replies into Cursor / Claude Desktop; Claude updates the G1 ledger stub.

**Cloud agents cannot perform either action** (Drive PDFs + outbound counsel email stay on AZM Mac / human).

---

## Action 1 — Adjudicate Ex2 lotto 7 (≈10 min)

**STATUS (2026-08-14): DONE — `Ex2-7 = 64906`**  
AZM confirmed from avviso screenshot (Lotto 7: Prezzo base d'asta €64.906,00 / Offerta minima €48.680,00). Pipeline `153850` is wrong → **EC-35** (lot-association + deterministic lot-section parse). Counsel send (Action 2) still open.

**Question (historical):** what is the CURRENT prezzo base for **lotto 7** in the fourth-sale avviso?  
The pipeline's last two runs say **153.850**; the runbook pass bar and the first two runs say **64.906**. One of them is another lot's row, an older attempt's price, or a bar error.

### Steps

1. Open on the Mac:  
   `/Volumes/Muba/Easy Casa Italia/EC Aste /Example 2/avviso quarta vendita lotto 4_7.pdf`
2. Find the section/table for **LOTTO 7** (search "lotto 7" or "LOTTO SETTE"). Ignore anything about lotto 4.
3. Read the row for the **quarta vendita / current sale attempt** — the avviso may list earlier attempts' prices; you want the price this avviso is actually announcing (usually labelled "prezzo base d'asta" for this vendita, with offerta minima = 75%).
4. Sanity cross-check: both candidates are internally consistent (64.906 → off. min. 48.680; 153.850 → off. min. 115.387,50), so consistency proves nothing — go by the lot label and the current-attempt label only.
5. Optional second witness: `disposizione vendita lotti 4 e 7_redacted.pdf` should mention both lots' values.

### Decision matrix — reply with one line

| You find | Reply | What happens next |
|---|---|---|
| Lotto 7 prezzo base = **64.906** (current attempt) | `Ex2-7 = 64906` | Dispatch **EC-35**: lot-association fix for this avviso's table shape, headline fixture from the real layout (values only, no PII), regression fence on lotto 4 = 36039 |
| Lotto 7 prezzo base = **153.850** (current attempt; 64.906 belongs to another lot / older attempt / other doc) | `Ex2-7 = 153850` | Docs-only **runbook bar correction** (64906 → 153850 + adjudication note) and declare eval pass bar **GREEN** on the existing 2026-08-14 post-EC-34 run — no new extract work |
| Something else (third value / ambiguous) | Paste a photo/screenshot of the lotto 7 table | Claude reads it and adjudicates with you |

**Also while the PDF is open (30 sec):** nothing else required from Example 2 for G1 close; GT-3 urbanistica watch stays for Drive GT score later.

---

## Action 2 — Counsel packet send (≈15 min)

**STATUS (2026-08-15): READY TO SEND — not yet sent**  
Eval bar already **GREEN (product-accepted)** via EC-G1-LEDGER. This is the **only** open G1 box.  
Send-ready pack (8 PDFs + filled IT email): Cursor artifacts  
`/opt/cursor/artifacts/counsel-aste-packet-2026-08-15/` · zip `counsel-aste-packet-2026-08-15.zip` · draft `counsel-email-ready-2026-08-15.md`.

**Suggested dates:** send **2026-08-15** · response by **2026-08-29**.  
**Attachment count:** **8** (LGL-1 = row 8 — do **not** attach a 9th duplicate).

**What:** email external counsel the Aste GDPR/legal packet. This ticks the second of three G1 boxes (waitlist already **WAIVED**).

### Attachments — checklist rows 1–8 (LGL-1 is row 8)

Per `docs/legal/counsel-send-checklist.md` (verified present in repo 2026-08-14; PDFs exported 2026-08-15):

| # | Document | Path |
| --- | --- | --- |
| 1 | Instruction letter | `docs/legal/counsel-instruction-letter.md` |
| 2 | Engineering / DPO review package | `docs/legal/COUNSEL-REVIEW-PACKAGE.md` |
| 3 | Privacy policy draft | `docs/legal/privacy-policy.md` |
| 4 | Mediation disclosure draft | `docs/legal/mediation-disclosure.md` |
| 5 | EC-S-T02 Sell Privately claims packet | `docs/legal/ec-s-t02-counsel-review-packet.md` |
| 6 | EC-S-T04 Mediazione boundary matrix | `docs/legal/T04_mediazione_boundary.md` |
| 7 | EC-S-T05 Seller-side data memo | `docs/legal/ec-s-t05-seller-data-memo.md` |
| 8 | **LGL-1** Analisi Aste addendum (Q-A1–Q-A6) | `docs/legal/aste-counsel-addendum-lgl1.md` |

Export LGL-1 (and other `.md` as needed) to PDF/DOCX if counsel prefers. **Do not** attach `.env`, tokens, or DB dumps.

> Note: earlier drafts said “9 files (1–8 + LGL-1)”; LGL-1 is already row 8 → **8 core attachments**.

### Body must ask for answers to LGL-1 questions, at minimum

- Q-A1 masking of third-party (esecutato) PII in user-uploaded court documents  
- Q-A2 MinIO retention policy  
- Q-A3 report disclaimers / glossary wording per output language  
- Q-A5 leads handling  
- Q-A6 OpenAI as sub-processor  

Also: request an **explicit response date** (suggest 2 weeks; state the calendar date). Note that answers gate a **not-yet-public** feature (flags off). Send from the MUNDIDA/EasyCasa address counsel already knows (`info@easycasaita.com` thread if one exists).

### After sending — reply with one line

```
packet sent 2026-08-DD (response requested by 2026-08-DD)
```

Claude updates the G1 ledger stub. **Counsel's eventual ANSWERS gate G2, not G1** — the send alone closes this G1 box.

---

## After both actions

| Ex2-7 outcome | Counsel | G1 state |
|---|---|---|
| 153850 (bar fix) | sent | **G1 GREEN candidate** → product call (`G1 green` / `stay hardening-first`) + Drive GT true-score as final evidence |
| 64906 (EC-35) | sent | EC-35 dispatch → merge → one more live 8/8 → then product call |

Remaining optional either way: Drive GT true-score vs `EC_Aste_GoldenSet_GroundTruth_v1.md`. Flags stay off; G2 / `aste-enable.md` unaffected until enable checklist.

---

## Standing reply formats (copy-paste)

```
Ex2-7 = 64906
```

```
Ex2-7 = 153850
```

```
packet sent 2026-08-DD (response requested by 2026-08-DD)
```
