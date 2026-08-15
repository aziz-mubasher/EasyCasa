# EC-S T19.2 — Legitimate Interests Assessment (LIA)

**Authoriser:** AZM product-owner (2026-08-15) — *proceed to complete PK-5 and PK-6*  
**Scope:** Automated duplicate-image block (`IMAGE_DUPDETECT_ENFORCE`) + manual seller account suspend UX  
**Status:** **ACCEPTED** for enablement (product-owner interim; external counsel countersign remains PK-7)

## Processing

| Element | Detail |
|---------|--------|
| Purpose | Fraud / abuse prevention: stop re-upload of identical listing photos across accounts; suspend repeat offenders |
| Data | Perceptual image hashes, media ids, listing ids, user ids, moderation_events, suspend reason |
| Categories | Sellers (and agents uploading listing media) |
| Automated decision | Exact DUPLICATE upload → HTTP 400 block when enforce=true. NEAR_DUPLICATE remains flag-only |
| Human review | Admin suspend / unsuspend via `/admin/abuse` (capability `vo_moderation`) |

## Balancing test (Art. 6(1)(f))

| Factor | Assessment |
|--------|------------|
| Controller interest | Legitimate — marketplace integrity, buyer trust, anti-spam / stolen-photo abuse |
| Necessity | Soft flag-only week already ran; enforce is the least residual step after perceptual match. Suspend is manual, reason-logged, reversible |
| Data-subject impact | Upload refusal of a duplicate file; suspend unpublishes listings and blocks new uploads/publish. Does not delete account or media by itself |
| Safeguards | Audit log; moderation_events; reason required on suspend; unsuspend available; no automated suspend |
| Outcome | **Interest prevails** for T19.2 enablement |

## Counsel boxes

| Item | Position |
|------|----------|
| LIA for IMAGE_DUPDETECT_ENFORCE | ☑ **accepted** (AZM 2026-08-15) |
| LIA for manual USER_SUSPEND | ☑ **accepted** (AZM 2026-08-15) |
| External counsel countersign | ☐ pending (PK-7) |

*Not legal advice. AZM product-owner interim acceptance mirrors G1 / PK-4 residual-risk pattern.*
