# Acquisto Assistito (`/[locale]/acquisto-assistito`) — claims register

**Date:** 15 September 2026 · **Page:** `https://easycasaita.com/en/acquisto-assistito`  
**Gates:** G1 (served %-of-sale catalogue) · counsel on drafting (§A1) and Trasferimento reserved items (§3)

## Live (this PR)

| Claim | Status | Note |
|---|---|---|
| Spec table: fee €1,490 + IVA · seller pays us €0 · does not change with price · third-party costs at cost | `live` | About us, not about agencies. |
| Art. 52 14-day withdrawal + art. 59 lett. a) early-start acknowledgement + art. 49 → terms + ODR | `live` | Mailto path: acknowledgement promised before work starts. Card checkout records a checkbox. |
| Identity footer = `/pricing` named hole + non-enrolment | `live` | Does not wear Mundida’s P.IVA. |
| Durations labelled typical elapsed time | `live` | `/trasparenza` already says we do not control third-party timelines. |
| Notary: shortlist, buyer appoints; we receive nothing | `live` | Same rule as `/trasparenza`. |
| Conformità: deed **null** (art. 29 c. 1-bis L. 52/1985) | `live` | More precise than “can be challenged”. |
| 3% is not a legal minimum (art. 6 L. 39/1989) | `live` | Fact only. No “liberalised” history, no agency-cost comparison. |

## Retracted

| Former claim | Why |
|---|---|
| Customary agency €10,980 vs EasyCasa €1,818 | Asserts we substitute for an agent; comparative advertising without a sourced survey; conflicts with `/agenzie`. |
| “The seller is customarily charged the same again” | Competitor-conduct claim, unsourced. |
| `EasyCasa Italia · P.IVA IT04531990986` on this footer | Mundida’s number under the EasyCasa name. |
| Seal citing a mediation mandate (art. 6 L. 39/1989) | We are not enrolled. Replaced with art. 1655 c.c. |

## Held for counsel (not in this PR)

- Steps 03 / 04 actor (drafting vs file prep) and removal of `OFFER_DRAFTING`.
- Trasferimento: *prima casa* eligibility review and *permesso* support.
- Folding the three tiers into `GET /service-catalog`.
