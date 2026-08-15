# G1 — Two human actions to close the gate

**Date:** 2026-08-14 · **Owner:** AZM · **Closed:** 2026-08-15  
**Context:** Extract set EC-29→35 merged + deployed. Live 8/8 scored. Both human actions **DONE**.  
**Canonical ledger:** `docs/audits/aste-g1-hardening-roadmap-ec29-33.md` → **G1 FULL GREEN**  
**Ready-to-send draft (historical):** `docs/legal/COUNSEL-EMAIL-aste-packet-ready-to-send.md`

**Cloud agents cannot perform either action** (Drive PDFs + outbound counsel email stay on AZM Mac / human).

---

## Action 1 — Adjudicate Ex2 lotto 7 (≈10 min)

**STATUS (2026-08-14): DONE — `Ex2-7 = 64906`**  
AZM confirmed from avviso screenshot (Lotto 7: Prezzo base d'asta €64.906,00 / Offerta minima €48.680,00). Pipeline `153850` is wrong → **EC-35** (lot-association + deterministic lot-section parse).

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

**STATUS (2026-08-15): DONE — `packet sent 2026-08-15 (response requested by 2026-08-29)`**  
Ready-to-send draft: [`docs/legal/COUNSEL-EMAIL-aste-packet-ready-to-send.md`](../legal/COUNSEL-EMAIL-aste-packet-ready-to-send.md)

**What:** email external counsel the Aste GDPR/legal packet. This ticks the second of three G1 boxes (waitlist already **WAIVED**).

### Attachments — checklist rows 1–8 (LGL-1 is row 8)

Per `docs/legal/counsel-send-checklist.md` (verified present in repo 2026-08-14):

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

**Recorded:** `packet sent 2026-08-15 (response requested by 2026-08-29)`. Ledger flipped to **G1 FULL GREEN**. Counsel's eventual **ANSWERS** still gate **G2**, not G1.

---

## After both actions

| Ex2-7 | Counsel | G1 state |
|---|---|---|
| **64906** (EC-35 done) | **sent 2026-08-15** | **G1 FULL GREEN** |

Next: `docs/runbooks/aste-pre-ec27-checklist.md`. Flags stay off; G2 / `aste-enable.md` await counsel answers + enable smoke.

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
