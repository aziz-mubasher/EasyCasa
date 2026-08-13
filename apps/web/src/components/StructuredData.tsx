import { buildListingJsonLd } from '@/lib/listing-json-ld';
import { JsonLdScript } from './JsonLdScript';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://easycasaita.com';

type Listing = {
  slug: string;
  title: string;
  description?: string;
  price?: number;
  city?: string;
  region?: string;
  sizeSqm?: number;
  rooms?: number;
  bedrooms?: number;
  propertyType?: string;
  images?: string[];
  firstPublishedAt?: Date;
};

export function ListingStructuredData({
  listing,
  locale = 'it',
}: {
  listing: Listing;
  locale?: string;
}) {
  const data = buildListingJsonLd({
    slug: listing.slug,
    locale,
    site: SITE,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    city: listing.city,
    province: listing.region,
    sizeSqm: listing.sizeSqm,
    rooms: listing.rooms,
    bedrooms: listing.bedrooms,
    propertyType: listing.propertyType,
    images: listing.images?.map((i) => (i.startsWith('http') ? i : `${SITE}${i}`)),
    firstPublishedAt: listing.firstPublishedAt,
  });
  if (!data) return null;
  return <JsonLdScript data={data} />;
}

export function OrganizationStructuredData() {
  return (
    <JsonLdScript
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
