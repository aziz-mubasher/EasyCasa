# Seller intro video — vendi da privato

**Status:** draft for production (IT master).  
**Page:** `/{it}/vendi-da-privato` · `/en/sell-privately` · `/es/vender-entre-particulares` → `#intro` (`SellerIntroFilm`).  
**Fullscreen popup:** same page opens `/vendi-da-privato/film/intro.html?lang={it|en|es}&record=1` in a viewport-covering dialog (hero «Guarda come funziona» + Schermo intero).  
**Recording sibling:** `apps/web/public/vendi-da-privato/film/intro.html`  
**T04 rows:** 2 (OMI as zone data), 4 (viewing slots the seller publishes), 5 (message transport). **Refuse** rows 10–12.  
**Ledger:** `apps/web/src/config/sell-privately/promises.json` — film uses only **live** promises (P2, P3, P5, P6, P7). P4 verified buyers stays out. P1 / savings / `mediazioneCopy` stay retracted.

The seller is the actor. EasyCasa tools are things the **seller does**, never things EasyCasa does *to the deal*.

---

## What the film must say

1. You publish the listing yourself. No mandate, no exclusivity.
2. A wizard guides photos, facts, asking price. You publish when ready.
3. OMI zone ranges appear **after sign-in**. Official zone data, not a valuation of that home (T04 row 2).
4. Enquiries arrive **to you**. EasyCasa carries the message; it does not negotiate (T04 rows 5 and 12).
5. You publish viewing slots; they pick; you confirm (T04 row 4).
6. Document checklist is live. Verified Owner is an **optional badge**, not a publish gate (P3 / P6).
7. Dashboard shows views, saves, enquiries — listing activity, not a price verdict (P7).
8. The next step (offer, *proposta*, *caparra*) is **not** EasyCasa’s. Do not show it.

## What the film must not say

Retracted or refused (EC-S-34 + `CLAUDE.md` §9):

- Seller-side fee / *provvigione* / «zero commissione» / €7.500–€9.150 / %-of-sale
- «We are not a mediatore» as a consumer defence (do not amplify; `blocks.mediazioneCopy` is hidden)
- Verified buyers / Banks4All token (P4 **coming**)
- Price recommendations or negotiation advice
- Offers, *proposta d’acquisto*, *caparra*
- *Sanabilità* or generated legal-risk conclusions
- EasyCasa matching / «ti mettiamo in contatto»

---

## Runtime (IT master ≈ 77s)

| # | File | ms | Spoken / on-screen |
|---|---|---:|---|
| 1 | `01-open.webp` | 8000 | Vendi casa tu. Pubblichi l’annuncio. Niente incarico. |
| 2 | `02-publish.webp` | 10000 | Lo scrivi tu. Foto, dati, prezzo richiesto. |
| 3 | `03-omi.webp` | 10000 | Fasce OMI ufficiali di zona, dopo l’accesso. Non una perizia. |
| 4 | `04-inbox.webp` | 10000 | Le richieste arrivano a te. EasyCasa trasporta. Non tratta. |
| 5 | `05-viewing.webp` | 10000 | Pubblichi gli slot. Confermi tu. |
| 6 | `06-docs.webp` | 10000 | Checklist. Badge Proprietario verificato opzionale. |
| 7 | `07-dashboard.webp` | 10000 | Visualizzazioni e richieste. Non un verdetto sul prezzo. |
| 8 | `08-close.webp` | 9000 | La casa è la tua. easycasaita.com |

EN and ES use the same timings (`sellPrivately.film.scenes` / `intro.html?lang=en|es`).

---

## How to record the MP4

Serve the frames directory and open the 16:9 sibling (no site chrome):

```bash
python3 -m http.server 8766 --directory apps/web/public/vendi-da-privato/film
# http://127.0.0.1:8766/intro.html?record=1&lang=it
```

Window 1920×1080. Record ~80s from first frame to ochre bar complete.  
Still frames: `intro.html?lang=it&still=1&scene=0` … `scene=7`.

Or: `apps/web/scripts/render-seller-intro-film.sh`.

Do **not** commit the MP4 to git. Hand the file to Aziz for YouTube / Instagram / CDN.

---

## VO script (IT, optional voice-over)

Same words as the cards. Read slowly, one breath per scene. No extra adjectives. No fee line. Stay on *pubblichi / rispondi / confermi*.
