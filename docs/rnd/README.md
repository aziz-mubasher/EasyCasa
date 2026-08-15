# EasyCasa — R&D surface for Claude

Claude cannot browse the product codebase. This folder is the **in-repo R&D index** Claude (and Aziz) should prefer when asking “what is the latest gate / extract truth?”

> **Standalone GitHub `azm-rnd` repo:** not created. Cloud agent GitHub App token returns **403** on `createRepository`. AZM can create `aziz-mubasher/azm-rnd` from his account if a cross-venture R&D-only repo is wanted; until then, use this path + the bridge ledger.

## Always start here

| Surface | Path / URL |
| --- | --- |
| Bridge status ledger (poll) | `docs/azm-deliverables/_bridge/status-ledger.json` · [raw main](https://raw.githubusercontent.com/aziz-mubasher/EasyCasa/main/docs/azm-deliverables/_bridge/status-ledger.json) |
| G1 gate ledger (Aste) | `docs/audits/aste-g1-hardening-roadmap-ec29-33.md` |
| Latest G1 R&D (product acceptance) | `docs/audits/G1-ledger-rnd-report.md` |
| Post–EC-35 extract R&D | `docs/audits/G1-post-ec35-rnd-report.md` |
| Human close (counsel) | `docs/runbooks/aste-g1-human-close.md` |
| Public enable (G2) | `docs/runbooks/aste-enable.md` — **do not open until G1 full green** |

## G1 one-liner (as of EC-G1-LEDGER)

Eval pass bar **GREEN (product-accepted)** · counsel **NOT SENT** · waitlist **WAIVED** · flags **off** · bridge **`task_8d0a770d`**.
