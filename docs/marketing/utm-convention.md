# Convenzione UTM — EasyCasa

Regola: minuscolo, underscore, nessun dato personale, nessun numero di telefono e nessuna e-mail in nessun link.

## IT

| Parametro | Valori |
| --- | --- |
| `utm_source` | `meta`, `google`, `tiktok`, `whatsapp`, `brevo`, `homio`, `qr_<luogo>`, `partner_<nome>` |
| `utm_medium` | `paid_social`, `cpc`, `email`, `whatsapp`, `qr`, `referral`, `organic_social` |
| `utm_campaign` | `ec_{pubblico}_{area}_{offerta}_{aaaamm}` oppure `el_{…}_{aaaamm}` |
| `utm_content` | id creatività, es. `v4_film_30s`, `carousel_a` |

Esempi:

- `ec_seller_bs_fascicolo_202611`
- `ec_buyer_lom_listings_202612`
- `el_aste_it_freefile_202611`

Il costruttore nella vista Analytics rifiuta un link che non rispetta la convenzione. Il raccoglitore scarta inoltre qualunque valore UTM che contiene `@` o una sequenza di 7 o più cifre.

Gli identificativi di clic (`gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`, `msclkid`) non si salvano. Si registra solo la presenza: `google_ads`, `meta`, `tiktok`, `bing`.

## EN

Lowercase, underscores, no personal data, no phone numbers and no email addresses in any link.

| Parameter | Values |
| --- | --- |
| `utm_source` | `meta`, `google`, `tiktok`, `whatsapp`, `brevo`, `homio`, `qr_<place>`, `partner_<name>` |
| `utm_medium` | `paid_social`, `cpc`, `email`, `whatsapp`, `qr`, `referral`, `organic_social` |
| `utm_campaign` | `ec_{audience}_{area}_{offer}_{yyyymm}` or `el_{…}_{yyyymm}` |
| `utm_content` | creative id, e.g. `v4_film_30s`, `carousel_a` |

Examples: `ec_seller_bs_fascicolo_202611`, `ec_buyer_lom_listings_202612`, `el_aste_it_freefile_202611`.

The Analytics link builder rejects a URL that breaks the convention. The collector also drops any UTM value containing `@` or a run of 7 or more digits.

Paid click ids are never stored. Only a presence flag is kept: `google_ads`, `meta`, `tiktok`, `bing`.
