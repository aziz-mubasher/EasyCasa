# COUNSEL-EMAIL — Aste packet ready to send (G1)

**Owner:** AZM (human only)  
**Status:** **SENT** — `packet sent 2026-08-15 (response requested by 2026-08-29)` → G1 FULL GREEN  
**Purpose (historical):** Close the last G1 box — **counsel packet sent**  
**Canonical checklist:** [`counsel-send-checklist.md`](./counsel-send-checklist.md)  
**Human-close runbook:** [`../runbooks/aste-g1-human-close.md`](../runbooks/aste-g1-human-close.md)  
**Ledger:** [`../audits/aste-g1-hardening-roadmap-ec29-33.md`](../audits/aste-g1-hardening-roadmap-ec29-33.md)

Cloud / Claude **cannot** send this: no authorized email connector, attachments must leave from your Mac, and counsel needs your MUNDIDA/EasyCasa From address.

---

## 1. Open mail and fill these fields

| Field | Value |
| --- | --- |
| **From** | MUNDIDA / EasyCasa address counsel already knows (e.g. `info@easycasaita.com` if that thread exists) |
| **To** | `[counsel name] <counsel@…>` — fill from your contacts |
| **Subject** | copy below |
| **Body** | copy below; fill the two dates + counsel name |
| **Attachments** | rows 1–8 (table below) — export to PDF/DOCX if counsel prefers |

Suggested dates (today = 2026-08-15):  
- **Sent:** `2026-08-15`  
- **Response requested by:** `2026-08-29` (≈2 weeks; change if you prefer)

---

## 2. Subject (copy)

```
EasyCasa (MUNDIDA) — counsel review packet (GDPR core + LGL-1 Analisi Aste)
```

---

## 3. Body (copy — then fill brackets)

```
Dear [Counsel name],

Please find attached the EasyCasa / MUNDIDA counsel review packet for your review.

This send covers:
• Core GDPR / product legal package (instruction letter, engineering DPO package,
  privacy + mediation drafts, EC-S Sell Privately T02/T04/T05 materials)
• LGL-1 addendum for the not-yet-public “Analisi Aste” feature (Q-A1–Q-A6)

Context for LGL-1: Analisi Aste lets users upload Italian judicial-auction documents
and receive an automated informational analysis. Feature flags remain OFF in
production until after your review. We are not asking you to green-light a public
launch in this email — we need your review timeline and answers to the LGL-1
questions (especially Q-A1 masking, Q-A2 retention, Q-A3 disclaimers, Q-A5 leads,
Q-A6 OpenAI as sub-processor).

Requested response by: [YYYY-MM-DD]

A short acknowledgement of receipt + your review timeline is enough for our
internal G1 gate. Your substantive answers unlock a later enable checklist (G2),
not this send.

Please do not hesitate to ask for any missing material.

Kind regards,
[Your name]
MUNDIDA S.r.l. — EasyCasa
P.IVA IT04531990986
```

Optional Italian subject if counsel prefers IT:

```
EasyCasa (MUNDIDA) — pacchetto di revisione legale (GDPR + LGL-1 Analisi Aste)
```

---

## 4. Attachments (8 files — LGL-1 is row 8)

Paths relative to your local clone (e.g. `/Volumes/Muba/EasyCasa/` or wherever you keep the repo). On GitHub `main`:

| # | Document | Local path | GitHub (`main`) |
| --- | --- | --- | --- |
| 1 | Instruction letter | `docs/legal/counsel-instruction-letter.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/counsel-instruction-letter.md |
| 2 | Engineering / DPO package | `docs/legal/COUNSEL-REVIEW-PACKAGE.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/COUNSEL-REVIEW-PACKAGE.md |
| 3 | Privacy policy draft | `docs/legal/privacy-policy.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/privacy-policy.md |
| 4 | Mediation disclosure draft | `docs/legal/mediation-disclosure.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/mediation-disclosure.md |
| 5 | EC-S-T02 claims packet | `docs/legal/ec-s-t02-counsel-review-packet.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/ec-s-t02-counsel-review-packet.md |
| 6 | EC-S-T04 mediazione matrix | `docs/legal/T04_mediazione_boundary.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/T04_mediazione_boundary.md |
| 7 | EC-S-T05 seller-data memo | `docs/legal/ec-s-t05-seller-data-memo.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/ec-s-t05-seller-data-memo.md |
| 8 | **LGL-1** Analisi Aste (Q-A1–Q-A6) | `docs/legal/aste-counsel-addendum-lgl1.md` | https://github.com/aziz-mubasher/EasyCasa/blob/main/docs/legal/aste-counsel-addendum-lgl1.md |

**Mac quick attach** (from repo root):

```bash
cd "/Volumes/Muba/EasyCasa"   # or your clone path
open -R \
  docs/legal/counsel-instruction-letter.md \
  docs/legal/COUNSEL-REVIEW-PACKAGE.md \
  docs/legal/privacy-policy.md \
  docs/legal/mediation-disclosure.md \
  docs/legal/ec-s-t02-counsel-review-packet.md \
  docs/legal/T04_mediazione_boundary.md \
  docs/legal/ec-s-t05-seller-data-memo.md \
  docs/legal/aste-counsel-addendum-lgl1.md
```

Export LGL-1 (and others) to PDF if counsel prefers PDF over Markdown.  
**Do not attach:** `.env`, tokens, DB dumps, Banks4All bearer secrets.

> Note: older notes said “9 attachments (1–8 + LGL-1)”. LGL-1 **is** checklist row 8 → **8 core files**.

---

## 5. After you hit Send

Paste this one line into Cursor / Claude Desktop (fill real dates):

```
packet sent 2026-08-DD (response requested by 2026-08-DD)
```

Example if you send today with a 2-week ask:

```
packet sent 2026-08-15 (response requested by 2026-08-29)
```

That reply triggers the pre-staged **G1 → FULL GREEN** ledger flip and opens the pre-EC-27 checklist.  
Counsel’s later **answers** gate **G2** (flag enable), not G1.

---

## 6. What this does / does not do

| Does | Does not |
| --- | --- |
| Closes G1 “counsel packet sent” | Flip `ASTE_ANALYSIS_ENABLED` |
| Unlocks EC-27 / monetization briefs **after** ledger records the send | Unlock G2 / public enable |
| Starts counsel’s review clock | Require counsel answers before G1 green |
