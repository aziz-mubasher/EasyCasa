# EC-30 / EC-31 / EC-S-T20 — batch completion note (for Claude / R&D)

**Date:** 2026-08-12  
**Merged (squash):**
| Task | PR | SHA |
|------|-----|-----|
| EC-30 field quality | [#134](https://github.com/aziz-mubasher/EasyCasa/pull/134) | `fab9973` |
| EC-31 eval DX + runbook | [#136](https://github.com/aziz-mubasher/EasyCasa/pull/136) | `0ebf1be` |
| EC-S-T20 seller inbox UI + CI | [#137](https://github.com/aziz-mubasher/EasyCasa/pull/137) | `fa63487` |
| T20 nav finish + T20 audit | follow-up | `123a5c8` / `fdd6ca3` |

**Deploy (VPS):** `api` + `ai` + `web` force-recreated after merge; tip includes T20 nav.  
**Verify:** `https://easycasaita.com/api/version` → `gitSha` at or after `fa63487` (web tip may be newer docs/nav).  
**Flags still off:** `ASTE_ANALYSIS_ENABLED`, `SELLER_INBOX_ENABLED`, `NEXT_PUBLIC_SELLER_INBOX_ENABLED`.

Per-task write-ups:
- `docs/audits/EC-30-completion-feedback.md`
- `docs/audits/EC-31-completion-feedback.md`
- `docs/audits/EC-S-t20-k145-completion-feedback.md` (already on main)

### Batch signal for Claude
1. **Do not double-dispatch** the same Kaizen/T20 code to two agents (#135 vs #137 race).
2. EC-30 + EC-31 were correctly parallelizable (AI extract vs API scorer/docs).
3. G1 still open: Mac eval + counsel send; waitlist waived.
4. Inbox stays dark until dual-flag flip after G1.
