# Buyer intro video — private seller or agency

**Status:** draft for production (IT master).  
**Page:** `/{it,en,es}/for-buyers` → `#intro` (`BuyerIntroFilm`).  
**Recording sibling:** `apps/web/public/for-buyers/film/intro.html`  
**T04 rows:** 2 (OMI as zone data), 4 (viewing slots), 5 (message transport). **Refuse** rows 10–12.

This is the buyer-facing story after product feedback: a buyer on EasyCasa may deal with a **private seller** or with a **real-estate agency**. The tools are the same. The counterparty is labelled.

---

## What the film must say

1. One Italian portal, two listing sources: *privato* and *agenzia*.
2. Search, then filter `Venditore → Privato | Agenzia` when you want one path.
3. The listing shows who published it.
4. OMI zone ranges appear **after sign-in**. They are official zone data, not a valuation of that home (T04 row 2).
5. The enquiry goes to the **publisher** (owner or agency). EasyCasa carries the message; it does not negotiate (T04 rows 5 and 12).
6. The buyer picks a viewing slot from real availability and gets a confirmation (T04 row 4).
7. The next step (offer, *proposta*, *caparra*) is **not** EasyCasa’s. Do not show it.

## What the film must not say

Retracted or refused (see `docs/ec-b-claims-register.md` + `CLAUDE.md` §9):

- Buyer-side fee / *provvigione* / «keep the commission» / €9.150 / «gratis»
- EasyCasa vs «traditional agency» as the enemy (agencies list here)
- «Privates only»
- «Verified buyers get answered first»
- Price recommendations or negotiation advice
- Offers, *proposta d’acquisto*, *caparra*
- *Sanabilità* or generated legal-risk conclusions
- «We are not a mediatore» as a consumer defence (foot copy is inherited; do not amplify in the film)

---

## Runtime (IT master ≈ 77s)

| # | File | ms | Spoken / on-screen |
|---|---|---:|---|
| 1 | `01-open.webp` | 8000 | Comprare casa in Italia. Un portale. Privati e agenzie. |
| 2 | `02-paths.webp` | 10000 | Venditore privato, o agenzia. Ogni annuncio dice chi l’ha pubblicato. |
| 3 | `03-search.webp` | 10000 | Sfoglia, poi filtra. Privato o Agenzia. |
| 4 | `04-listing.webp` | 10000 | Vedi la casa. Vedi chi l’ha messa. |
| 5 | `05-price.webp` | 10000 | Fasce OMI ufficiali di zona, dopo l’accesso. Non una perizia. |
| 6 | `06-message.webp` | 10000 | Scrivi a chi ha pubblicato. EasyCasa trasporta. Non tratta. |
| 7 | `07-viewing.webp` | 10000 | Scegli uno slot. Confermano loro. Tu visiti. |
| 8 | `08-close.webp` | 9000 | La casa è la stessa. easycasaita.com |

EN and ES use the same timings (`forBuyers.film.scenes` / `intro.html?lang=en|es`).

---

## How to record the MP4

Serve the frames directory and open the 16:9 sibling (no site chrome):

```bash
python3 -m http.server 8765 --directory apps/web/public/for-buyers/film
# http://127.0.0.1:8765/intro.html?record=1&lang=it
```

Window 1920×1080. Record ~80s from first frame to ochre bar complete.  
Still frames: `intro.html?lang=it&still=1&scene=0` … `scene=7`.

Do **not** commit the MP4 to git. Hand the file to Aziz for YouTube / Instagram / CDN, then optionally point a `<video>` at the hosted URL.

---

## VO script (IT, optional voice-over)

Same words as the cards. Read slowly, one breath per scene. No extra adjectives. No fee line. No «ti mettiamo in contatto» as a matching promise — stay on *cerca / filtra / scrivi / prenota*.
