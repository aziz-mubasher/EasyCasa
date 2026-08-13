/**
 * EC-S-T33 — schema.org JSON-LD builders (@easycasa/shared).
 *
 * Pure builders: DTO in, plain object out; the Next layer calls `serializeJsonLd`
 * via `JsonLdScript` into `<script type="application/ld+json">`.
 * - Injection-safe serialization: `<`, `>`, `&` escaped as unicode so listing
 *   text (seller-authored!) can never close the script tag.
 * - Prices are the seller's asking price presented as-is — no derived,
 *   estimated, or "suggested" values may enter structured data (T04 row 3).
 * - Only publishable facts: no seller PII beyond what the public page shows,
 *   never document/verification internals.
 * - Ledger consistency: FAQPage answers come from approved i18n copy — this
 *   module takes strings, it does not author claims (G4 owns claim text).
 */

export interface ListingSeoInput {
  /** Canonical absolute URL of the listing page (locale-specific). */
  url: string;
  title: string;
  description: string;
  priceEur: number;
  sqm: number;
  rooms: number;
  /** schema.org-compatible type; caller maps repo propertyType. */
  schemaType: 'Apartment' | 'House' | 'SingleFamilyResidence' | 'Residence';
  comune: string;
  provincia: string;
  /** Public CDN image URLs (masters only — never private doc URLs). */
  images: readonly string[];
  /** Sticky first publish (T13) — honest datePosted. */
  firstPublishedAt?: Date;
}

export interface FaqItem {
  question: string;
  answer: string;
}

type JsonLd = Record<string, unknown>;

export function buildRealEstateListing(l: ListingSeoInput): JsonLd {
  if (!/^https:\/\//.test(l.url)) throw new Error(`listing url must be absolute https: ${l.url}`);
  if (!(l.priceEur > 0)) throw new Error('priceEur must be positive');

  const obj: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    url: l.url,
    name: l.title,
    description: l.description,
    about: {
      '@type': l.schemaType,
      numberOfRooms: l.rooms,
      floorSize: {
        '@type': 'QuantitativeValue',
        value: l.sqm,
        unitCode: 'MTK',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: l.comune,
        addressRegion: l.provincia,
        addressCountry: 'IT',
      },
    },
    offers: {
      '@type': 'Offer',
      price: l.priceEur,
      priceCurrency: 'EUR',
      // Private seller: offeredBy stays generic — no PII in structured data.
      offeredBy: { '@type': 'Person', name: 'Privato' },
    },
  };
  if (l.images.length > 0) obj.image = [...l.images];
  if (l.firstPublishedAt) obj.datePosted = l.firstPublishedAt.toISOString();
  return obj;
}

export function buildFaqPage(items: readonly FaqItem[]): JsonLd {
  if (items.length === 0) throw new Error('FAQPage requires at least one item');
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/**
 * Serialize for embedding in <script type="application/ld+json">.
 * Escapes <, >, & to unicode sequences: seller-authored text cannot break out
 * of the script context (`</script>` becomes inert).
 */
export function serializeJsonLd(obj: JsonLd): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
