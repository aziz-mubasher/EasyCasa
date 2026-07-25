import type { SmartLinkPublicPayload } from './smartlink';
import { parseListingDetail, type ParsedListingDetail } from './listing-detail';

export function smartLinkListingToDetail(
  listing: SmartLinkPublicPayload['listing'],
  token: string,
): ParsedListingDetail {
  const slug = listing.slug ?? token;
  return parseListingDetail(
    {
      ...listing,
      id: token,
      slug,
      media: listing.media.map((m) => ({ url: m.url, type: 'image', position: m.position })),
      coverUrl: listing.coverUrl,
    },
    slug,
  );
}

export function smartLinkPhotoUrls(listing: SmartLinkPublicPayload['listing']): string[] {
  const detail = smartLinkListingToDetail(listing, 'preview');
  return detail.photoUrls.length ? detail.photoUrls : listing.coverUrl ? [listing.coverUrl] : [];
}
