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

export interface ServiceBenefitInput {
  id: string;
  title: string;
  body: string;
}

export interface ServiceOfferInput {
  name?: string;
  price: string;
  priceCurrency: string;
  description?: string;
}

export interface ServiceSeoInput {
  /** Canonical absolute URL of the service page (locale-specific). */
  pageUrl: string;
  site: string;
  serviceName: string;
  description?: string;
  serviceType: string;
  /** Single-offer description (sell-privately / valutazione). */
  offerDescription?: string;
  /** Explicit offer(s); defaults to a free EUR offer when omitted. */
  offers?: ServiceOfferInput | readonly ServiceOfferInput[];
  liveBenefits?: readonly ServiceBenefitInput[];
}

type JsonLd = Record<string, unknown>;

const EASY_CASA_PROVIDER = {
  '@type': 'Organization' as const,
  name: 'EasyCasa',
  legalName: 'MUNDIDA S.r.l.',
  taxID: 'IT04531990986',
};

function normalizeServiceOffers(input: ServiceSeoInput): JsonLd | JsonLd[] {
  if (input.offers !== undefined) {
    const list = Array.isArray(input.offers) ? input.offers : [input.offers];
    return list.map((o) => ({
      '@type': 'Offer',
      ...(o.name !== undefined ? { name: o.name } : {}),
      price: o.price,
      priceCurrency: o.priceCurrency,
      ...(o.description !== undefined ? { description: o.description } : {}),
    }));
  }
  return {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    ...(input.offerDescription !== undefined ? { description: input.offerDescription } : {}),
  };
}

/** schema.org Service builder — shared by sell-privately and service landings. */
export function buildService(input: ServiceSeoInput): JsonLd {
  if (!/^https:\/\//.test(input.pageUrl)) {
    throw new Error(`service pageUrl must be absolute https: ${input.pageUrl}`);
  }
  if (!/^https:\/\//.test(input.site)) {
    throw new Error(`service site must be absolute https: ${input.site}`);
  }

  const obj: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.serviceName,
  };
  if (input.description !== undefined) obj.description = input.description;
  obj.url = input.pageUrl;
  obj.serviceType = input.serviceType;
  obj.provider = {
    '@type': 'Organization',
    name: EASY_CASA_PROVIDER.name,
    legalName: EASY_CASA_PROVIDER.legalName,
    url: input.site,
    taxID: EASY_CASA_PROVIDER.taxID,
  };
  obj.areaServed = { '@type': 'Country', name: 'Italy' };
  obj.availableLanguage = ['it', 'en', 'es'];
  obj.offers = normalizeServiceOffers(input);
  if (input.liveBenefits !== undefined && input.liveBenefits.length > 0) {
    obj.additionalProperty = input.liveBenefits.map((b) => ({
      '@type': 'PropertyValue',
      name: b.title,
      value: b.body,
    }));
  }
  return obj;
}

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
