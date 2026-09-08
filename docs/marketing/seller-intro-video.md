# Private-seller intro video (v0)

**Surface:** `/{locale}/vendi-da-privato` — player after the hero.  
**Asset:** `apps/web/public/videos/vendi-da-privato-intro.it.mp4`  
**Source of truth:** `scripts/seller-intro-video/scenes.json`  
**Regenerate:** `node scripts/seller-intro-video/generate.mjs`

This is a **first cut for product feedback**. Voice and picture are Italian; EN/ES pages show the same film with a localized transcript.

## What it explains

The live seller journey, phrased as things the seller does (T04 engineering rule 2):

1. Publish via the listing wizard  
2. See official OMI zone ranges  
3. Upload a visura for Verified Owner (optional to publish)  
4. Receive enquiries — Banks4All buyer badge labelled **in arrivo**  
5. Publish viewing slots and confirm requests  
6. Use the seller area for documents, enquiries, and listing activity  

## Legal / honesty floor

- No savings figures, no % of sale, no contingent fee (T04 row 8; EC-S-34 retracted Claim 1).  
- No “we are not a mediatore” consumer claim (EC-S-34 retracted Claim 2).  
- No negotiation / offer / *proposta* / *caparra* (T04 rows 10–12).  
- No *sanabilità* or generated legal-risk conclusion.  
- P4 stays “coming soon”, matching `promises.json`.

## Voiceover (IT)

See `sellPrivately.intro.transcript` in `apps/web/messages/it.json`.

## Script brief for Claude (v1.1)

v0 was cut from marketing copy. The website path is different (7-step wizard, OMI after publish, photo URLs, P4 still coming).

**Claude: write the next script from** `docs/marketing/seller-intro-video-script-brief.md`.  
Cursor will film v1.1 from that script. Do not invent screens.
