// JSON-LD structured data for rich results. Keep values in sync with the visible page.
type Listing = {
  slug: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  images?: string[];
  region?: string;
  city?: string;
  sizeSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  latitude?: number;
  longitude?: number;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}

export function ListingStructuredData({
  listing,
  locale = 'it',
}: {
  listing: Listing;
  locale?: string;
}) {
  const url = `${SITE}/${locale}/listings/${listing.slug}`;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Product', 'RealEstateListing'],
    name: listing.title,
    description: listing.description,
    url,
    image: listing.images?.map((i) => (i.startsWith('http') ? i : `${SITE}${i}`)),
    ...(listing.latitude != null && listing.longitude != null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: listing.latitude,
            longitude: listing.longitude,
          },
        }
      : {}),
    ...(listing.city || listing.region
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: listing.city,
            addressRegion: listing.region,
            addressCountry: 'IT',
          },
        }
      : {}),
    ...(listing.price != null
      ? {
          offers: {
            '@type': 'Offer',
            price: listing.price,
            priceCurrency: listing.currency ?? 'EUR',
            availability: 'https://schema.org/InStock',
            url,
          },
        }
      : {}),
    ...(listing.sizeSqm != null
      ? { floorSize: { '@type': 'QuantitativeValue', value: listing.sizeSqm, unitCode: 'MTK' } }
      : {}),
    ...(listing.bedrooms != null ? { numberOfBedrooms: listing.bedrooms } : {}),
    ...(listing.bathrooms != null ? { numberOfBathroomsTotal: listing.bathrooms } : {}),
  };
  return <JsonLd data={data} />;
}

export function OrganizationStructuredData() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'EasyCasa',
        url: SITE,
        logo: `${SITE}/logo.png`,
      }}
    />
  );
}
